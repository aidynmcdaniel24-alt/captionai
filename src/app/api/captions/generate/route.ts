import { NextResponse } from "next/server";
import { logAdminEvent } from "@/lib/admin-log";
import { polishCaptions } from "@/lib/caption-formatter";
import { guardTopic } from "@/lib/content-moderation";
import {
  computeCaptionScores,
  deriveCaptionRatingsFromScores,
  type CaptionScore,
} from "@/lib/caption-score";
import { getGroqClient } from "@/lib/groq-client";
import { withGroqRetry } from "@/lib/groq-retry";
import type { CaptionRatingKey } from "@/lib/caption-rating-styles";
import {
  defaultCaptionRatings,
  parseCaptionModelJson,
  type ParsedCaptionResponse,
} from "@/lib/parse-caption-response";
import { maybeSendHighScoreEmail } from "@/lib/score-notifications";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import { sanitizeText } from "@/lib/security/sanitize";
import {
  readJsonWithLimit,
  REQUEST_SIZE_LIMITS,
} from "@/lib/security/request-size";
import { supabaseServer } from "@/lib/supabase/server";
import { spendTokens, TOKEN_COSTS, tokenInfoPayload } from "@/lib/tokens";
import { captionCountForPlan, isAnnualPlan } from "@/lib/plan";
import {
  brandVoicePromptBlock,
  getBrandVoice,
  type BrandVoice,
} from "@/lib/brand-voice";

type Plan = "free" | "pro" | "annual";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolvePlatform(platform: string, custom: string) {
  const p = platform.trim();
  if (p.toLowerCase() === "custom" && custom.trim()) {
    return custom.trim().slice(0, 80);
  }
  return p.slice(0, 80) || "Instagram";
}

function resolveTone(tone: string, custom: string) {
  const t = tone.trim();
  if (t.toLowerCase() === "custom") {
    const c = custom.trim();
    return c ? c.slice(0, 80) : "casual";
  }
  return t.slice(0, 80) || "inspirational";
}

type PlatformProfile = {
  voice: string;
  length: string;
  hashtags: string;
  notes: string;
  examples: string[];
};

const TWITTER_X_PROFILE: PlatformProfile = {
  voice:
    "Witty, tight, punchy. One single thought, sharpened to a point. Self-aware, slightly mischievous, occasionally self-deprecating. Conversational lowercase usually lands best.",
  length:
    "STRICT MAXIMUM 280 characters total — hashtags and emoji included. Aim for under 240 for retweetability. One line, occasionally two short lines. NEVER exceed 280 characters.",
  hashtags:
    "0 hashtags is best. Maximum 1 hashtag, only if it is genuinely topical. NEVER use more than 1 hashtag. Most great tweets use zero.",
  notes:
    "The hook IS the post. No warm-up, no setup, no 'thread coming below'. Should feel like a quote a stranger would screenshot. Self-deprecating humor and clean specific observations beat motivational lines every time.",
  examples: [
    "spent 20 mins writing a caption. AI did it in 5 seconds. I need to rethink my career choices.",
    "the most underrated business strategy is remembering people's names.",
    "you don't need a brand. you need a regular tuesday that people miss when it's gone.",
  ],
};

const PLATFORM_PROFILES: Record<string, PlatformProfile> = {
  instagram: {
    voice:
      "Storytelling and lifestyle-focused. Visual, sensory, slightly aspirational but grounded in a real moment. Sounds like a friend sharing a personal scene from their day, not a brand running an ad.",
    length:
      "EXACTLY 3-5 sentences of body copy. The body copy must NEVER contain any hashtags. After the final sentence of body copy ends (with its punctuation and any closing emoji), insert a literal blank line (a \\n\\n line break), then place all hashtags together on the FINAL line as a single space-separated block.",
    hashtags:
      "8-12 hashtags total. ABSOLUTE RULE: hashtags MUST appear on a completely separate new line at the very end of the caption, with one fully blank line (\\n\\n) between the body copy and the hashtag line. NEVER inline a hashtag inside a sentence. NEVER put a hashtag on the same line as body copy. NEVER mix hashtags into the paragraph. Format: <body copy>\\n\\n#tag1 #tag2 #tag3 ... Mix 2-3 broader reach tags with 6-9 niche tags that genuinely match the content. All lowercase, no spaces inside a tag. VERIFY SPELLING of every hashtag before returning — typos like #coldplunch instead of #coldplunge are unacceptable.",
    notes:
      "First line must stop the scroll on its own — never start with \"I\", a time marker (\"Today\", \"Day 1\"), or a restatement of the topic. Build 3-5 sentences with at least one concrete physical or numeric detail (a sound, a time, a temperature, a specific object — not abstract feelings alone). Some captions end on a strong statement; do not force every caption to end with a question. If you use a question, make it specific to this post, not generic. No corporate buzzwords, no influencer cliches, no journey-documenting language. STRICTLY FORBIDDEN openers on Instagram (TikTok hooks): \"POV:\", \"Tell me why\", \"Not me\", \"This is your sign\", \"Stop scrolling\", \"no one talks about\", \"wait for it\", \"the way I…\", \"I was today years old\". Body copy must contain ZERO hashtags — hashtags only on the dedicated final line after a blank line. Double-check every hashtag spelling before returning (e.g. #coldplunge not #coldplunch).",
    examples: [
      "The gasp comes before the decision every single time. Forty-eight degrees, metal tub on the porch, neighbor's dog staring through the fence like I've lost my mind. Fingers go numb somewhere around ninety seconds — that's when the panic stops being the whole story.\n\n#coldplunge #coldexposure #morningroutine #recovery #wellness #biohacking #icebath #mindovermatter #healthjourney #wimhof #coldtherapy #dailyhabit",
      "Not everyone who posts ice baths actually likes cold water. Some of us are just stubborn enough to keep showing up at 5:42am when the tub steams in the wrong direction. The shock still wins on day twelve. The difference is you stop negotiating with it mid-splash.\n\n#coldplunge #5amclub #discipline #coldwater #recoveryday #wellnessjourney #habitstacking #mentaltoughness #selfimprovement #icebath",
    ],
  },
  tiktok: {
    voice:
      "Gen Z native, very punchy and energetic. Often lowercase. Sounds like a friend texting you something they're hyped about. No corporate speak, no influencer voice, ever.",
    length:
      "STRICT 1-3 short lines maximum. The first 5 words must stop the scroll. Total caption body under ~150 characters before hashtags. NEVER write a paragraph.",
    hashtags:
      "3-5 hashtags maximum. Mix 1 broad reach tag (#fyp / #foryou / #foryoupage) with 2-4 niche tags that match the actual content. Lowercase, no spaces. Every hashtag must be spelled correctly — verify letter-by-letter before returning.",
    notes:
      "MUST open with a punchy TikTok-native hook. STRONGLY PREFER one of these openers: 'POV:', 'Tell me why', 'Not me', 'This is your sign', 'no one talks about', 'wait for it', 'the way I\u2026'. Then one quick payoff line, optional emoji. Reads like a one-liner, not a paragraph.",
    examples: [
      "POV: you just found the fastest way to write captions \ud83e\udd2f Drop a \ud83d\udd25 if you needed this #contentcreator #socialmediatips #tiktokhacks",
      "Tell me why I spent 4 hours on a caption AI just wrote in 5 seconds \ud83d\udc80 #fyp #contentcreator #aitools #socialmediahacks",
      "Not me realizing my old captions were the reason no one was commenting \ud83d\ude2d this is your sign to switch it up #fyp #creatortips #tiktokgrowth",
    ],
  },
  linkedin: {
    voice:
      "Professional but distinctly human. Thought leadership through a specific story or lesson learned \u2014 NEVER jargon. First-person. Speaks to other operators, builders, and founders like an equal. ABSOLUTELY PLAIN TEXT ONLY: LinkedIn does NOT render markdown, so NEVER use **bold**, *italic*, _underscores_, `backticks`, ###headers, or any other markdown formatting characters. NEVER use bullet symbols like \"- \" or \"* \" as list markers; if you need a list, use short standalone paragraphs instead.",
    length:
      "EXACTLY 3-5 SHORT paragraphs of 1-2 sentences MAXIMUM each, separated by a LITERAL BLANK LINE (a \\n\\n line break) between every paragraph. The first paragraph is one short standalone line that doubles as the LinkedIn preview hook. ABSOLUTELY FORBIDDEN: one long block of text, a single wall-of-text paragraph, or paragraphs longer than 2 sentences. If your draft is one big paragraph, BREAK IT INTO 3-5 short paragraphs separated by blank lines before returning. No markdown, no bolding, no asterisks \u2014 just plain sentences separated by line breaks.",
    hashtags:
      "MAXIMUM 2 hashtags. Industry-relevant, CamelCase or lowercase. Often best to skip hashtags entirely. NEVER more than 2. Hashtags go on the final line, plain text, no markdown around them.",
    notes:
      "Open with a contrarian truth, a specific number, or a vulnerable moment \u2014 NEVER a TikTok / short-form opener. First line must not start with \"I\", a time marker, or a topic restatement. STRICTLY FORBIDDEN openers on LinkedIn: \"POV:\", \"Tell me why\", \"Not me\", \"This is your sign\", \"no one talks about\", \"wait for it\", \"the way I\u2026\", \"stop scrolling\", \"I was today years old\". Build a tiny narrative across professional paragraphs with at least one concrete detail per post. Land on a clear, useful lesson — not a generic motivational quote. Some posts end on a strong statement; questions are optional and must be specific when used. Output must be plain prose paragraphs only \u2014 no markdown characters anywhere.",
    examples: [
      "I used to spend 30 minutes writing one caption.\n\nNow it takes 10 seconds.\n\nThe lesson? Work smarter, not harder. The tools changed, but more importantly, the way I think about my time changed.\n\nWe romanticize the grind. We rarely audit what the grind is actually for.\n\nWhat tools have changed how you work?",
      "Three years ago I quit a six-figure engineering job to open a coffee shop.\n\nLast Tuesday a customer cried at the bar because the espresso reminded her of her father.\n\nThe spreadsheet measures revenue. The relationships measure why we're really here.\n\nMost businesses get this backwards.\n\nWhat's the most unexpected metric your work actually changes?",
    ],
  },
  "twitter/x": TWITTER_X_PROFILE,
  twitter: TWITTER_X_PROFILE,
  x: TWITTER_X_PROFILE,
  facebook: {
    voice:
      "Conversational and friendly, like talking to a neighbor at the mailbox or a long-time group chat. Warm, personable, lightly nostalgic is fine. Not corporate, not influencer-coded.",
    length:
      "STRICT 2-3 sentences. Short and friendly. No long monologues, no multi-paragraph essays.",
    hashtags:
      "0-3 hashtags maximum. Local or community-relevant when used. Many great Facebook posts use no hashtags at all.",
    notes:
      "Open with a small, relatable scene or moment — not with \"I\" or \"Today\". Keep it tight at 2-3 sentences with at least one concrete detail. A question or CTA is optional; when used, keep it specific to the post, not generic.",
    examples: [
      "Funny how a quiet Saturday turned into the best afternoon I've had all month. Sometimes the unplanned hours really are the best ones. What did you get up to this weekend?",
      "Just poured our 100,000th cup of coffee this morning \u2014 still kind of in shock. Thanks for being part of it, neighbors. Who's a small business that's been part of your week lately?",
    ],
  },
  youtube: {
    voice:
      "Search-optimized but still human. Hook the viewer to keep watching. Include keywords naturally in the first 1-2 lines because that's what appears in search results.",
    length:
      "2-4 paragraphs. Open with a 1-2 line hook, then a slightly longer description, then a list of timestamps or chapter teasers if it makes sense, then a CTA to like/subscribe.",
    hashtags:
      "3-8 keyword-rich hashtags at the end. The first 3 hashtags appear above the title on YouTube, so make them count.",
    notes:
      "Front-load the most searchable keyword phrase. Speak in benefits and curiosity (what the viewer will learn or feel).",
    examples: [
      "I opened a coffee shop in New Orleans with $14,000 and zero hospitality experience.\n\nThis is everything I'd do differently — from the lease negotiation to the espresso machine I should never have bought.\n\nIf you're thinking about opening a café, this one is for you.\n\nLike + Subscribe for the full restaurant business series.\n\n#smallbusiness #coffeeshop #entrepreneurship #neworleans #howtostartabusiness",
    ],
  },
  pinterest: {
    voice:
      "Descriptive, SEO-keyword-rich, calmly informative. Pinterest is a search engine, not a feed.",
    length:
      "1-3 sentences. Lead with the main searchable subject + benefit, then add supporting keywords naturally.",
    hashtags:
      "3-5 keyword hashtags at the end. Lowercase, no spaces, topical.",
    notes:
      "Use full, searchable phrases (e.g. 'cozy reading nook ideas for small apartments' rather than 'cozy vibes'). Skip slang.",
    examples: [
      "Cozy independent coffee shop ideas in New Orleans — warm lighting, vintage records, and a slow-mornings playlist for journaling, reading, or weekend dates.\n\n#coffeeshopaesthetic #neworleansguide #cozycafe #datespotideas #slowmornings",
    ],
  },
  threads: {
    voice:
      "Casual, conversational, slightly more personal than Twitter. Reads like a half-formed thought you'd text a group chat.",
    length:
      "1-3 short sentences. Low-key tone, no setup, no buildup.",
    hashtags:
      "0-2 hashtags max. Threads users mostly skip hashtags.",
    notes:
      "Should feel like the start of a conversation, not a polished marketing post. A small confession, observation, or question works well.",
    examples: [
      "everyone says 'find your community' but the truth is you have to build the room you wish existed and then leave the door open.",
      "the third-wave coffee shop on my corner has the same five regulars every morning and I think that's the closest thing to a religion I've found.",
    ],
  },
  bluesky: {
    voice:
      "Casual and conversational like early Twitter. Slightly looser, friendlier, low corporate energy.",
    length:
      "Under 300 characters. Single thought, conversational.",
    hashtags:
      "0-2 hashtags max. Lowercase, topical.",
    notes:
      "Sound like a real person posting from their phone. Lowercase and a small opinion or observation works best.",
    examples: [
      "small coffee shops are the closest thing most cities still have to a public living room.",
    ],
  },
};

function profileForPlatform(platform: string): PlatformProfile {
  const key = platform.trim().toLowerCase();
  const direct = PLATFORM_PROFILES[key];
  if (direct) {
    return direct;
  }

  if (key.includes("tiktok")) return PLATFORM_PROFILES.tiktok!;
  if (key.includes("insta")) return PLATFORM_PROFILES.instagram!;
  if (key.includes("linkedin")) return PLATFORM_PROFILES.linkedin!;
  if (key.includes("twitter") || key === "x" || key.includes("x.com") || key.includes("/x")) {
    return PLATFORM_PROFILES["twitter/x"]!;
  }
  if (key.includes("youtube") || key === "yt") return PLATFORM_PROFILES.youtube!;
  if (key.includes("pinterest")) return PLATFORM_PROFILES.pinterest!;
  if (key.includes("thread")) return PLATFORM_PROFILES.threads!;
  if (key.includes("bluesky") || key.includes("bsky")) return PLATFORM_PROFILES.bluesky!;
  if (key.includes("facebook") || key === "fb") return PLATFORM_PROFILES.facebook!;

  return {
    voice:
      "Adapt to this platform's typical audience and posting style. Sound like a real human, not a brand.",
    length:
      "Match the length conventions a regular user of this platform would actually post — not longer.",
    hashtags:
      "Use the hashtag conventions of this platform. If unsure, use 2-4 niche, lowercase, topical hashtags.",
    notes:
      "Open with a strong hook in the first 5 words — not with \"I\" or a time marker. Include at least one concrete detail. End with a question or statement as fits the platform; do not force a generic question on every caption.",
    examples: [],
  };
}

function formatPlatformBriefing(profile: PlatformProfile): string {
  const parts = [
    `VOICE: ${profile.voice}`,
    `LENGTH: ${profile.length}`,
    `HASHTAGS: ${profile.hashtags}`,
    `NOTES: ${profile.notes}`,
  ];
  if (profile.examples.length > 0) {
    const examples = profile.examples
      .map((ex, i) => `EXAMPLE ${i + 1}:\n${ex}`)
      .join("\n\n");
    parts.push(`REFERENCE EXAMPLES (do not copy, match the quality bar):\n${examples}`);
  }
  return parts.join("\n");
}

const BANNED_PHRASES = `BANNED PHRASES — never use these or anything close to them. Scan every caption before returning; if any appear, rewrite that line:
"Today marks the beginning", "a mix of emotions", "excitement and trepidation", "nervous but excited", "stay tuned", "stay tuned for updates", "documenting my journey", "sharing my journey", "I'll be documenting", "the science behind", "I'm eager to", "daunting but worth it", "push my body to its limits", "test my physical and mental endurance", "see the benefits", "embark on", "dive in", "game-changer", "revolutionize", "leverage", "in today's world", "In a world where", "Imagine a place where", "Whether you're a... or a...", "It's not just X, it's Y", "Let's dive in", "Buckle up", "level up", "unlock potential", "comment below!!", "double tap if you agree", "smash that like button", "follow for more!!!"`;

const FIRST_LINE_RULES = `FIRST LINE — every caption's opening line must work as a standalone scroll-stopper:
- FORBIDDEN: starting with "I", "I'm", "I've", "My", or "We".
- FORBIDDEN: starting with a time marker ("Today", "Thirty days", "Day 1", "This morning", "Day one").
- FORBIDDEN: restating the topic as the opener ("Cold plunging is...", "Starting my cold plunge challenge").
- GOOD: sensory punch, contrarian line, specific number, unexpected image, mid-action scene, sharp observation.
- Platform-specific opener bans (TikTok hooks on Instagram/LinkedIn): "POV:", "Tell me why", "Not me", "This is your sign", "Stop scrolling", "no one talks about", "wait for it", "the way I…", "I was today years old".`;

const CONCRETE_DETAIL_RULES = `CONCRETE DETAIL — mandatory in EVERY caption:
Each caption must contain at least one specific, physical, or numeric detail that could NOT apply to a generic post about the same broad topic. Abstract feelings alone are not enough.
Examples (cold plunge): the involuntary gasp, fingers numb at the 90-second mark, the 5:42am alarm, the dog watching confused, water so cold your teeth chatter before you decide to get in.
If you cannot point to a concrete detail in a caption, add one or rewrite.`;

const CTA_RULES = `QUESTIONS & CTAs:
- Do NOT end every caption with a question — overusing generic questions ("What's your favorite way to challenge yourself?", "Who else can relate?", "Would you try this?") is an AI tell.
- Across the batch, at least one caption MUST end on a strong statement, observation, or punchline — no question at all.
- When you do use a question, it must be specific to THIS content and this moment, not interchangeable with any other post.
- Twitter/X often needs no question. Instagram, LinkedIn, and Facebook may use questions on some captions but not all.`;

const CAPTION_ARCHETYPES = `MANDATORY STRUCTURAL VARIETY — this is the #1 priority. Each caption in the batch MUST use a structurally DIFFERENT archetype. Never reuse the same opener, skeleton, or emotional arc twice. If any two captions share an opener or structure, rewrite one before returning.

FORBIDDEN SKELETON (never use for ANY caption — this produced identical reworded captions in live testing):
"I'm starting X → I feel nervous/excited → I'll see benefits → generic question."
If you catch yourself writing this pattern in any form, scrap it and start over with a different archetype.

Assign these distinct structures across the captions (use the first four; for count > 4, invent additional structurally unique angles that do not echo any of these):

Archetype A — IN THE MIDDLE OF THE MOMENT: Drop the reader into the scene right now. Present tense. Sensory and physical. No "I'm starting X" setup, no preamble. Example energy: "The water hits your chest and your lungs forget what air is."

Archetype B — CONFESSION / CONTRARIAN ADMISSION: Open with something unexpectedly honest or against-type. Example energy: "Cold water people? Not really one of them." Then earn the rest with specifics.

Archetype C — NUMBER, LIST, OR SHARP SINGLE OBSERVATION: One specific stat, a tight list, or one razor observation that could not be swapped to another topic. Example energy: "Ninety seconds. That's when the fingers go numb." or "Three things the tutorial skipped: ..."

Archetype D — REFLECTIVE LESSON: A genuine insight from experience — NOT a generic motivational quote, NOT "the journey teaches you" fluff. Land on something specific learned, phrased like you'd tell a friend over coffee.

Platform-native opener rules still apply on top of these archetypes:
  • TikTok: open with POV:, Tell me why, Not me, or another pattern interrupt — max 3 lines total.
  • Instagram / LinkedIn: NEVER use TikTok-style openers. Use sensory punch, contrarian line, number, or mid-action scene instead.
  • Twitter/X: witty or contrarian, under 280 characters total.
  • YouTube / Pinterest: lead with a searchable, keyword-rich claim instead of slang.

CRITICAL: ALL captions must feel like they were written by different people — different opener style, rhythm, sentence length, vocabulary, emotional register, and ending type (some questions, some statements).`;

const SCORE_RUBRIC = `CAPTION QUALITY SCORE — score each caption on a 0-100 scale, broken into 5 fixed buckets:
  • hook (0-25)         — how strongly the FIRST LINE stops the scroll. 25 = irresistible, 0 = generic / forgettable.
  • emotion (0-25)      — does the caption make a real human FEEL something (laugh, relate, ache, hype)? 25 = visceral, 0 = flat marketing copy.
  • cta (0-20)          — does it clearly invite the reader to do something (comment, save, tag, click, reflect)? 20 = natural and specific, 0 = nothing.
  • platformFit (0-20)  — is the length, format, and hashtag count correct for THIS platform? 20 = textbook, 0 = wrong format.
  • originality (0-10)  — avoids clichés ("game-changer", "level up", "in a world where", "comment below!!"). 10 = fresh, 0 = full of clichés.
Then write a SHORT one-line explanation (max 110 chars) shaped like "Strong hook but weak CTA." Be honest — do not give every caption an 80+.`;

const FORMATTING_RULES = `FORMATTING RULES — these are non-negotiable. The caption must be ready to paste with ZERO editing:

- PUNCTUATION: every sentence must end with proper punctuation (. ! or ?). No trailing dashes, no naked clauses, no sentences that just stop. Use commas to separate clauses, not dashes-everywhere.
- CAPITALIZATION: capitalize the first letter of every sentence and proper nouns. Do NOT randomly UPPERCASE single words for emphasis (e.g. "this is AMAZING") unless the tone is explicitly hype/yelling. Prefer punctuation or wording for emphasis.
- SPACING: single space between words. Exactly one space after a period/comma. NEVER double-space. NEVER add a space before punctuation.
- LINE BREAKS: use \\n\\n (blank line) only as a paragraph separator. Never put a single \\n in the middle of a sentence. Within a paragraph, write one continuous flowing line.
- EMOJI: place them naturally — end of a sentence, end of a paragraph, or right next to the noun they describe. NEVER scatter random emoji between every word. Maximum 1-3 emoji per caption body (hashtags don't count). Same emoji should never repeat back-to-back (no "💪💪💪").
- CHARACTERS: use straight quotes (") and apostrophes ('), not smart quotes. Use real "..." (three dots) not "…". Use "—" with a space on each side only as a deliberate em-dash.
- HASHTAGS: lowercase, no spaces inside the tag, no broken tags like "# tag". Spell every hashtag correctly — verify letter-by-letter against the topic before returning. They follow the platform's placement rule (see PLATFORM BRIEFING). Instagram: body copy ends, then \\n\\n, then ALL hashtags on ONE final line only.
- The final caption must feel polished, intentional, and ready to post. If a sentence reads awkwardly, REWRITE it before returning.`;

const QUALITY_RULES = `WHAT MAKES A GREAT CAPTION (apply to all):

${BANNED_PHRASES}

${FIRST_LINE_RULES}

${CONCRETE_DETAIL_RULES}

${CTA_RULES}

- HUMAN, NOT AI: write like a real person posting from their phone. Use contractions, casual phrasing, occasional sentence fragments, real-sounding rhythm. If a line sounds like a LinkedIn marketing template or a ChatGPT journey post, rewrite it.
- SPECIFICS OVER GENERICS: use concrete details, real numbers, names of things, sensory imagery. AVOID vague claims like "amazing", "best ever", "next level", "synergy", "elevate", "transform your life". Replace them with something only this post could say.
- EMOTIONAL TRUTH: each caption should make the reader feel something real or recognize themselves in it. No fake hype, no manufactured urgency, no "mix of emotions" language.
- Match the requested TONE exactly without breaking the platform voice.
- HASHTAGS must follow the platform's hashtag rules EXACTLY — correct spelling is mandatory (verify each tag letter-by-letter against the topic):
    • Instagram: 8-12 hashtags on a NEW LINE after a blank line. ZERO hashtags inside body copy.
    • TikTok: 3-5 correctly-spelled hashtags.
    • LinkedIn: maximum 2 hashtags. Often zero.
    • Twitter/X: 0 hashtags is best, maximum 1, and the WHOLE post must be ≤ 280 characters.
    • Facebook: 0-3 hashtags maximum.
  Never exceed the platform's hashtag count. Never use banned or generic spam tags (#love, #instagood without context, #followforfollow, etc.).`;

const RATING_RUBRIC = `RATING RUBRIC — read carefully, this is where most AIs get it wrong.

The single question you are answering is:
  "Which caption is a real human in this niche most likely to actually engage with — save it, screenshot it, send it to a friend, comment on it, or stop and re-read it?"

That caption is "best". The one a real human would scroll past with the least reaction is "worst". The remaining one is "medium".

Score each caption internally on:
  • Genuine resonance & relatability — does it make the reader feel "that's literally me" or laugh out loud? (35%)
  • Emotional truth & specificity — does it feel like a real moment, a real lesson, or a real joke, not a marketing template? (25%)
  • Memorability / screenshot-worthiness — is there a line, image, or observation a creator would actually screenshot or quote? (20%)
  • Platform fit — length, voice, format, and hashtag rules followed exactly (15%)
  • CTA naturalness — does it invite engagement like a real human, not a desperate brand? (5%)

CRITICAL ANTI-BIAS RULES — you MUST obey all of these:
  1. Do NOT automatically rate the caption with the LOUDEST opener ("POV:", "Stop scrolling.", "Tell me why", etc.) as "best". A quiet, specific, emotionally true line very often beats a loud one.
  2. Do NOT automatically rate the most POLISHED or most "marketing-template" caption as "best". Polish is not engagement. Templated polish is often the LEAST engaging.
  3. The genuinely FUNNIEST caption — if it is actually funny (specific, unexpected, self-aware), not corny — is almost always the most engaging. Reward real humor by raising it toward "best", not lowering it.
  4. The most RELATABLE caption — the one that makes a real person in the niche feel seen — is usually the one people actually save and share. Reward real relatability.
  5. Do NOT default to rating the "story / lifestyle moment" caption (Caption 2 archetype) as "worst" just because it is softer or quieter than the punchy hook. Stories very often win.
  6. Do NOT default to rating Caption 1 as "best", Caption 2 as "medium", and Caption 3 as "worst" (or any other fixed positional order). Genuinely judge based on the rubric.
  7. If two captions are genuinely close, prefer the one that sounds MORE human and LESS like a brand. "Sounds AI-written" is a strong negative signal.
  8. The "best" rating is earned by what a reader would actually do, not by which caption looks the most aggressive on the page.

Then assign labels: the highest-scoring caption gets "best", the lowest gets "worst", and the remaining one gets "medium". You MUST use each of "best", "medium", and "worst" EXACTLY once across the three captions.

Before you finalize the ratings, ask yourself one more time: "If I were a real person scrolling this platform, which of these three would actually stop me?" That one is "best".`;

const PRO_AMPLIFIERS = `PRO BOOST — stronger hooks, sharper voice, more distinct archetypes:
You are operating above standard quality. Each caption must use a clearly different structural archetype — not three rewordings of the same idea.

Techniques to deploy (one or two per caption, not all stacked in one):
  • OPEN LOOPS: a specific number or detail the reader has to keep reading to resolve ("90 seconds in, something shifts", "the part the tutorial skipped").
  • SOCIAL PROOF baked in: small, believable specifics ("our 100,000th cup", "after 11 months testing this", "a regular told me…"). Never round, made-up numbers.
  • CONTRAST and PARADOX: "The expensive gear didn't matter. The 5:42am alarm did."
  • SENSORY ANCHORS: smells, sounds, weather, time-of-day, physical sensations. Pull the reader into a scene.
  • NICHE FLUENCY: vocabulary a real insider in this niche would use, not outsider-sounding words.
  • HASHTAG LADDER: mix 1-2 broad reach tags with mid-size and niche specialist tags. Every tag must be spelled correctly.
  • ENDING VARIETY: mix statement endings with specific questions — never default every caption to a generic question.

Tone: confident insider who knows the niche cold. Distinct archetypes matter more than loud openers.`;

const ELITE_AMPLIFIERS = `ELITE MODE — genuinely specific, screenshot-worthy writing (Annual / top tier):
Everything in PRO BOOST applies, plus:
  • EVERY caption must stand alone as post-worthy — specific enough to screenshot, natural enough to post from a phone without editing.
  • MASTER-LEVEL HOOKS: the first line stops the scroll on its own — sensory, contrarian, or numeric — with a concrete detail in the first two sentences, never abstract setup.
  • STRUCTURAL ROTATION: use a different copywriting shape per caption — mid-action scene, confession, numbered observation, reflective lesson. Never repeat a framework twice in the same batch.
  • NICHE-SPECIFIC LANGUAGE: exact vocabulary, references, and in-jokes a true insider would use. An outsider should feel they're reading someone who lives in this world.
  • EMOTIONAL PRECISION: target a specific, nameable emotion per caption (stubborn pride, disbelief, relief, dry humor) rather than generic "inspiration".
  • RHYTHM & SOUND: vary sentence length for cadence. Read it aloud in your head — effortless, never overwritten or hypey.
  • Never sacrifice natural voice for cleverness. If a caption sounds AI-polished, strip it back and add one more concrete detail instead.`;

function buildPrompt({
  topic,
  platform,
  tone,
  language,
  plan,
  count,
  brandVoiceBlock,
}: {
  topic: string;
  platform: string;
  tone: string;
  language: string;
  plan: Plan;
  count: number;
  brandVoiceBlock: string | null;
}): string {
  const profile = profileForPlatform(platform);
  const briefing = formatPlatformBriefing(profile);
  const isElite = plan === "annual";
  const isPro = plan === "pro" || isElite;
  const amplifier = isElite
    ? ELITE_AMPLIFIERS
    : isPro
      ? PRO_AMPLIFIERS
      : "STANDARD MODE (Free): write clean, correct, good captions. Keep them grounded and natural. Still enforce structural variety across archetypes, concrete details, banned phrase scan, and platform formatting — quality bar is human and post-ready, not generic AI filler.";

  const countInstruction = `OUTPUT COUNT — you MUST return EXACTLY ${count} distinct captions (not 3, not fewer — exactly ${count}).

STRUCTURAL VARIETY IS MANDATORY: each caption must use a different archetype (see DISTINCT CAPTION ANGLES below). Never reuse the same opener, skeleton, or "starting X → nervous/excited → benefits → question" pattern. If any two captions share structure or opening rhythm, rewrite before returning. Think of them as written by ${count} different people with ${count} different ideas — not ${count} rewordings of one idea.`;

  const ratingInstruction =
    count === 3
      ? `Assign labels: the highest-scoring caption gets "best", the lowest gets "worst", and the remaining one gets "medium". Use each of "best", "medium", and "worst" EXACTLY once across the three.`
      : `Assign labels across the ${count} captions: give the single strongest caption "best", the single weakest "worst", and label every other caption "medium". There must be exactly one "best" and exactly one "worst"; all others are "medium".`;

  return `You are a top 1% social media copywriter who writes captions that real creators screenshot, save, and study. Your captions sound HUMAN, never AI-generated. Your #1 job is structural variety — each caption in a batch must be a different archetype, not the same idea reworded.

REQUEST
  Topic:    "${topic}"
  Platform: "${platform}"
  Tone:     "${tone}"
  Language: ${language}

PLATFORM BRIEFING for ${platform} (these constraints are non-negotiable)
${briefing}

${FORMATTING_RULES}

${QUALITY_RULES}

${countInstruction}

DISTINCT CAPTION ANGLES — assign a different archetype to each caption; never repeat structure:
${CAPTION_ARCHETYPES}

${RATING_RUBRIC}

RATING LABELS FOR THIS REQUEST: ${ratingInstruction}

${SCORE_RUBRIC}
${brandVoiceBlock ? `\n${brandVoiceBlock}\n` : ""}
${`\n${amplifier}\n`}
MANDATORY SELF-CHECK — run this on EVERY caption before returning JSON. If any check fails, fix it first:
  1. STRUCTURAL VARIETY: Are all ${count} captions structurally different? Do any two share an opener, skeleton, or the forbidden "starting X → nervous/excited → benefits → question" pattern? If yes, rewrite.
  2. BANNED PHRASES: Scan every line against the BANNED PHRASES list. If any appear (or close paraphrases), rewrite that line.
  3. INSTAGRAM (when platform is Instagram): Are ALL hashtags on their own line after a blank line (\\n\\n), with ZERO hashtags inside body copy? Is every hashtag spelled correctly letter-by-letter?
  4. CONCRETE DETAIL: Does each caption contain at least one specific physical or numeric detail that could not apply to a generic post?
  5. FIRST LINE: Does each opening line work as a standalone scroll-stopper — NOT starting with "I"/"I'm", NOT a time marker ("Today", "Day 1"), NOT a restatement of the topic?
  6. HUMAN VOICE: Would a real person actually post this from their phone? Not overwritten, not hypey, not every caption ending in the same generic question?
  7. PLATFORM FORMAT: Does each caption match ${platform} length, hashtag count, and formatting rules exactly? (TikTok: max 3 lines + 3-5 hashtags. Instagram: 3-5 body sentences + blank line + 8-12 hashtags on own line. LinkedIn: 3-5 short paragraphs with blank lines between, max 2 hashtags, no TikTok openers, no markdown. Twitter/X: ≤280 chars total, witty/contrarian, max 1 hashtag. Facebook: 2-3 sentences, 0-3 hashtags.)
  8. RATINGS: Did you apply the RATING RUBRIC honestly — not defaulting to "Caption 1 = best" or "loudest opener = best"?
  9. FORMATTING: Every sentence ends with proper punctuation; no double spaces; no random ALL CAPS; emoji placed naturally; straight quotes only.
If any answer is no, rewrite that caption (or re-rate) before returning.

FINAL OUTPUT \u2014 return STRICT JSON ONLY, no markdown fences, no commentary, with this exact shape (every array MUST have exactly ${count} entries, one per caption, in the same order):
{
  "captions": [${Array.from({ length: count }, (_, i) => `"caption ${i + 1} text"`).join(", ")}],
  "emojiPerCaption": [${Array.from({ length: count }, () => `["emoji","emoji"]`).join(", ")}],
  "captionRatings": [${Array.from({ length: count }, () => `"best"|"medium"|"worst"`).join(", ")}],
  "captionScores": [
${Array.from({ length: count }, () => `    {"hook": 0-25, "emotion": 0-25, "cta": 0-20, "platformFit": 0-20, "originality": 0-10, "explanation": "one short line"}`).join(",\n")}
  ]
}

Requirements:
- captions has exactly ${count} strings; each is the FULL caption text INCLUDING hashtags where the platform calls for them (Instagram hashtags on a new line at the end).
- captionRatings[i] rates captions[i]. ${ratingInstruction}
- emojiPerCaption has exactly ${count} arrays of 2-4 single emoji characters (not words, not text) that fit each caption.
- captionScores[i] scores captions[i] using the SCORE RUBRIC above. Every numeric field must be an INTEGER inside the allowed range. The explanation must be \u2264 110 characters and must reflect the strongest and weakest dimensions in plain English (e.g. "Strong hook but weak CTA.").
- Write all caption text in ${language}.`;
}

function isInstagramPlatform(platform: string): boolean {
  return platform.trim().toLowerCase().includes("insta");
}

function isLinkedInPlatform(platform: string): boolean {
  return platform.trim().toLowerCase().includes("linkedin");
}

function stripLinkedInMarkdown(caption: string): string {
  let text = caption;
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, "$1");
  text = text.replace(/\*\*(.+?)\*\*/g, "$1");
  text = text.replace(/(^|\s)\*(?!\s)([^*\n]+?)(?<!\s)\*(?!\w)/g, "$1$2");
  text = text.replace(/(^|\s)_([^_\n]+?)_(?!\w)/g, "$1$2");
  text = text.replace(/`([^`\n]+?)`/g, "$1");
  text = text.replace(/^\s*#{1,6}\s+/gm, "");
  text = text.replace(/^\s*[-*]\s+/gm, "");
  return text;
}

// LinkedIn captions must read as 3-5 short paragraphs of 1-2 sentences each,
// separated by blank lines. The model frequently returns either a wall of text
// or one block with double-spaces between sentences instead of real paragraph
// breaks, so we always rebuild from sentences. This guarantees short paragraphs
// AND collapses any double-spacing between sentences.
function splitLinkedInIntoParagraphs(caption: string): string {
  const trimmed = caption.trim();
  if (!trimmed) return caption;

  // Pull off any trailing hashtag block (LinkedIn allows up to 2) so we can
  // reattach it on its own final line after we rebuild the body.
  let body = trimmed;
  let hashtagLine = "";
  const trailingHashtags = body.match(
    /(?:^|\s)((?:#[\p{L}\p{N}_]+(?:[ \t]+|$))+)\s*$/u
  );
  if (trailingHashtags && typeof trailingHashtags.index === "number") {
    const tags = trailingHashtags[1].trim().split(/\s+/).filter(Boolean);
    hashtagLine = tags.join(" ");
    body = body.slice(0, trailingHashtags.index).trim();
  }

  // Flatten ALL whitespace (newlines, single AND double spaces) to a single
  // space so we can re-segment into clean paragraphs from scratch.
  const flatBody = body.replace(/\s+/g, " ").trim();
  if (!flatBody) {
    return hashtagLine || caption;
  }

  const sentences = flatBody
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length < 2) {
    return hashtagLine ? `${flatBody}\n\n${hashtagLine}` : flatBody;
  }

  const paragraphs: string[] = [];
  if (sentences.length <= 5) {
    // 2-5 sentences: one sentence per paragraph for maximum breathing room.
    for (const s of sentences) paragraphs.push(s);
  } else {
    // 6+ sentences: keep the first sentence as a standalone hook, then pair
    // remaining sentences 1-2 per paragraph.
    paragraphs.push(sentences[0]);
    for (let i = 1; i < sentences.length; i += 2) {
      paragraphs.push(sentences.slice(i, i + 2).join(" "));
    }
    // Cap at 5 paragraphs by merging extras into the last one.
    while (paragraphs.length > 5) {
      const last = paragraphs.pop()!;
      paragraphs[paragraphs.length - 1] = `${paragraphs[paragraphs.length - 1]} ${last}`;
    }
  }

  const rebuilt = paragraphs.join("\n\n");
  return hashtagLine ? `${rebuilt}\n\n${hashtagLine}` : rebuilt;
}

function normalizeInstagramHashtagPlacement(caption: string): string {
  const trimmed = caption.trim();
  if (!trimmed) return caption;

  const firstHashIndex = trimmed.search(/#[\p{L}\p{N}_]+/u);
  if (firstHashIndex < 0) {
    return caption;
  }

  const tailFromFirstHash = trimmed.slice(firstHashIndex);
  const isOnlyTrailingHashtagBlock = /^(?:#[\p{L}\p{N}_]+[ \t]*)+$/u.test(tailFromFirstHash);

  if (isOnlyTrailingHashtagBlock) {
    const hashtags = (tailFromFirstHash.match(/#[\p{L}\p{N}_]+/gu) ?? []).join(" ");
    const body = trimmed.slice(0, firstHashIndex).replace(/[ \t\r\n]+$/g, "");
    if (!body) return hashtags;
    return `${body}\n\n${hashtags}`;
  }

  const allHashtags = (trimmed.match(/#[\p{L}\p{N}_]+/gu) ?? []).join(" ");
  const bodyOnly = trimmed
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!bodyOnly) return allHashtags;
  return `${bodyOnly}\n\n${allHashtags}`;
}

function postProcessCaptions(captions: string[], platform: string): string[] {
  const onInstagram = isInstagramPlatform(platform);
  const onLinkedIn = isLinkedInPlatform(platform);

  const platformAdjusted = captions.map((cap) => {
    let next = cap;
    if (onLinkedIn) {
      next = stripLinkedInMarkdown(next);
      next = splitLinkedInIntoParagraphs(next);
    }
    if (onInstagram) {
      next = normalizeInstagramHashtagPlacement(next);
    }
    return next;
  });

  // Final pass: spacing, punctuation, ALL CAPS, emoji placement, polish.
  return polishCaptions(platformAdjusted);
}

const PARSE_RETRY_ATTEMPTS = 3;

const STRICT_JSON_SYSTEM =
  "You write elite-level social media captions. Output must be a single JSON object only — no markdown fences, no commentary, no text before or after the JSON.";

const CREATIVE_JSON_SYSTEM =
  "You write elite-level social media captions that real creators screenshot and save. Each caption in a batch must use a structurally different archetype — never the same skeleton reworded. Match platform voice and formatting exactly. Always return strict JSON when asked.";

async function fetchCaptionsFromGroq(
  groq: NonNullable<ReturnType<typeof getGroqClient>>,
  topic: string,
  platform: string,
  tone: string,
  language: string,
  plan: Plan,
  count: number,
  brandVoiceBlock: string | null,
  attempt: number
): Promise<string> {
  const strict = attempt > 0;
  const isElite = plan === "annual";
  const isPro = plan === "pro" || isElite;
  const temperature = strict ? 0.5 : isElite ? 0.97 : isPro ? 0.95 : 0.85;
  const completion = await withGroqRetry(() =>
    groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: strict ? STRICT_JSON_SYSTEM : CREATIVE_JSON_SYSTEM,
        },
        {
          role: "user",
          content: buildPrompt({
            topic,
            platform,
            tone,
            language,
            plan,
            count,
            brandVoiceBlock,
          }),
        },
      ],
    })
  );
  return completion.choices[0]?.message?.content ?? "";
}

async function generateParsedCaptions(
  groq: NonNullable<ReturnType<typeof getGroqClient>>,
  topic: string,
  platform: string,
  tone: string,
  language: string,
  plan: Plan,
  count: number,
  brandVoiceBlock: string | null,
  userId: string
): Promise<ParsedCaptionResponse | null> {
  for (let attempt = 0; attempt < PARSE_RETRY_ATTEMPTS; attempt++) {
    const content = await fetchCaptionsFromGroq(
      groq,
      topic,
      platform,
      tone,
      language,
      plan,
      count,
      brandVoiceBlock,
      attempt
    );
    const parsed = parseCaptionModelJson(content, count);
    if (parsed) {
      return parsed;
    }
    await logAdminEvent("warn", "groq parse captions invalid JSON", {
      userId,
      attempt: attempt + 1,
      preview: content.slice(0, 200),
    });
  }
  return null;
}

export async function POST(req: Request) {
  const authResult = await requireUser(req, "captions:generate");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "captions:generate",
    RATE_LIMITS.captionGenerate,
    "You're generating captions too fast. Please wait a minute and try again."
  );
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const topic = sanitizeText(body.topic, { maxLength: 500, allowLineBreaks: true });
  const platformRaw = sanitizeText(body.platform ?? "Instagram", { maxLength: 80 });
  const platformCustom = sanitizeText(body.platformCustom, { maxLength: 80 });
  const toneRaw = sanitizeText(body.tone ?? "inspirational", { maxLength: 80 });
  const toneCustom = sanitizeText(body.toneCustom, { maxLength: 80 });
  const language =
    sanitizeText(body.language ?? "English", { maxLength: 40 }) || "English";

  const platform = resolvePlatform(platformRaw, platformCustom);
  const tone = resolveTone(toneRaw, toneCustom);

  if (!topic) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  const moderation = await guardTopic(topic, {
    userId,
    feature: "captions:generate",
  });
  if (!moderation.ok) return moderation.response;

  // Auto-create the subscription row on first use so the token spend
  // helper has a plan to read. We don't need the row's value here — the
  // token helper re-reads it before deciding what to charge.
  const { data: subscriptionRow } = await supabaseServer
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (!subscriptionRow) {
    await supabaseServer.from("subscriptions").insert({
      user_id: userId,
      plan: "free",
      updated_at: new Date().toISOString(),
    });
  }

  const spend = await spendTokens(userId, TOKEN_COSTS.caption, "captions:generate");
  if (!spend.ok) {
    return spend.response;
  }

  const plan: Plan = spend.plan;
  const proBoost = plan === "pro" || plan === "annual";
  const qualityTier: "standard" | "pro" | "elite" =
    plan === "annual" ? "elite" : plan === "pro" ? "pro" : "standard";
  const count = captionCountForPlan(plan);

  // Brand Tone Profiles are an Annual feature. Reading is fully defensive so a
  // missing table or read error never blocks caption generation.
  let brandVoice: BrandVoice | null = null;
  if (isAnnualPlan(plan)) {
    brandVoice = await getBrandVoice(userId);
  }
  const brandVoiceBlock = brandVoice ? brandVoicePromptBlock(brandVoice) : null;
  const brandToneActive = Boolean(brandVoiceBlock);

  const groq = getGroqClient();
  if (!groq) {
    await logAdminEvent("error", "groq key missing", { userId });
    return NextResponse.json(
      {
        error: "Missing GROQ_API_KEY in environment variables.",
        stage: "groq-key-read",
      },
      { status: 500 }
    );
  }

  let captions: string[] = [];
  let emojiPerCaption: string[][] = Array.from({ length: count }, () => []);
  let captionRatings: CaptionRatingKey[] = defaultCaptionRatings(count);
  let captionScores: CaptionScore[] = [];

  try {
    const parsed = await generateParsedCaptions(
      groq,
      topic,
      platform,
      tone,
      language,
      plan,
      count,
      brandVoiceBlock,
      userId
    );

    if (!parsed) {
      await logAdminEvent("error", "groq parse captions failed after retries", { userId });
      return NextResponse.json(
        { error: "AI response format was invalid. Please try again." },
        { status: 502 }
      );
    }

    captions = postProcessCaptions(parsed.captions, platform);
    emojiPerCaption = parsed.emojiPerCaption;
    captionScores = computeCaptionScores(captions, platform, parsed.captionScores);
    // Derive the Best/Medium/Worst labels from the numeric scores so they can
    // never disagree with what the user sees (overrides the model's labels).
    captionRatings = deriveCaptionRatingsFromScores(captionScores);

    const { data: inserted, error: historyError } = await supabaseServer
      .from("caption_history")
      .insert({
        user_id: userId,
        topic,
        platform,
        tone,
        captions,
        language,
        ai_ratings: captionRatings,
      })
      .select("id")
      .single();

    if (historyError) {
      console.error("[caption_history]", historyError.message);
    }

    const historyId = inserted?.id as string | undefined;

    if (historyId) {
      for (let i = 0; i < captions.length; i++) {
        const { error: rateErr } = await supabaseServer.from("caption_ratings").upsert(
          {
            user_id: userId,
            history_id: historyId,
            caption_index: i,
            rating: captionRatings[i],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,history_id,caption_index" }
        );
        if (rateErr) {
          console.warn("[caption_ratings]", rateErr.message);
        }
      }
    }

    // Best-effort: send a celebration email if any caption scored 80+. Limited
    // to once per UTC day per user inside the helper. Fire-and-forget so it
    // never delays the API response.
    void maybeSendHighScoreEmail({
      userId,
      captions,
      scores: captionScores,
      platform,
    });

    return NextResponse.json({
      captions,
      emojiPerCaption,
      captionRatings,
      captionScores,
      historyId,
      plan,
      proBoost,
      qualityTier,
      brandToneActive,
      tokens: tokenInfoPayload(spend),
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown Groq API error.";
    await logAdminEvent("error", "groq-generate failed", { userId, details });
    return NextResponse.json(
      {
        error: "Could not generate AI captions right now. Please try again in a moment.",
        stage: "groq-generate",
        details: safeErrorMessage(error, "AI service error."),
      },
      { status: 500 }
    );
  }
}
