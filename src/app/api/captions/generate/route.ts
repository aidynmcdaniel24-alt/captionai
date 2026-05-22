import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { logAdminEvent } from "@/lib/admin-log";
import { containsBlockedWord, getBlockedWordList } from "@/lib/blocked-words";
import { getGroqClient } from "@/lib/groq-client";
import { withGroqRetry } from "@/lib/groq-retry";
import type { CaptionRatingKey } from "@/lib/caption-rating-styles";
import {
  defaultCaptionRatings,
  parseCaptionModelJson,
  type ParsedCaptionResponse,
} from "@/lib/parse-caption-response";
import { supabaseServer } from "@/lib/supabase/server";

type Plan = "free" | "pro";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

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
      "8-12 hashtags total. ABSOLUTE RULE: hashtags MUST appear on a completely separate new line at the very end of the caption, with one fully blank line between the body copy and the hashtag line. NEVER inline a hashtag inside a sentence. NEVER put a hashtag on the same line as body copy. NEVER mix hashtags into the paragraph. Format: <body copy>\\n\\n#tag1 #tag2 #tag3 ... Mix 2-3 broader reach tags with 6-9 niche tags that genuinely match the content. All lowercase, no spaces inside a tag, no banned or generic spam tags.",
    notes:
      "Open with a hook that creates a feeling or paints a scene in the first 5 words. Build a small lifestyle/storytelling moment across 3-5 sentences using specific sensory details. ALWAYS end with a soft, genuine question that invites people to share their own version in the comments. No corporate buzzwords, no influencer cliches. The body copy itself must contain ZERO hashtags — hashtags only live in the dedicated final hashtag line described above.",
    examples: [
      "Some days you just need to slow down and remember why you started. This moment reminded me that the little things are actually the big things. The light hit the window just right and I forgot what I was rushing toward. What's been your reminder lately? \u2728\n\n#lifestyle #mindset #inspiration #grateful #contentcreator #slowliving #intentionalliving #selfcare #morningroutine #goodvibes",
      "POV: you ordered the cortado but stayed for the playlist. We didn't plan a vibe \u2014 we just played the records we love and somehow strangers ended up staying for hours. The best moments aren't the ones you schedule. They're the ones you let happen. What's a place that surprised you like that?\n\n#coffeeshopvibes #cortado #independentcoffee #vinylcommunity #localfinds #slowmornings #cafeculture #thirdwavecoffee #morningritual #neworleans",
    ],
  },
  tiktok: {
    voice:
      "Gen Z native, very punchy and energetic. Often lowercase. Sounds like a friend texting you something they're hyped about. No corporate speak, no influencer voice, ever.",
    length:
      "STRICT 1-3 short lines maximum. The first 5 words must stop the scroll. Total caption body under ~150 characters before hashtags. NEVER write a paragraph.",
    hashtags:
      "3-5 hashtags maximum. Mix 1 broad reach tag (#fyp / #foryou / #foryoupage) with 2-4 niche tags that match the actual content. Lowercase, no spaces.",
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
      "EXACTLY 3-5 SHORT paragraphs of 1-2 sentences each, separated by a blank line between paragraphs. The first paragraph is one short standalone line that doubles as the LinkedIn preview hook. No markdown, no bolding, no asterisks \u2014 just plain sentences separated by line breaks.",
    hashtags:
      "MAXIMUM 2 hashtags. Industry-relevant, CamelCase or lowercase. Often best to skip hashtags entirely. NEVER more than 2. Hashtags go on the final line, plain text, no markdown around them.",
    notes:
      "Open with a contrarian truth, a specific number, or a vulnerable moment \u2014 NEVER a TikTok / short-form opener. STRICTLY FORBIDDEN openers on LinkedIn: \"POV:\", \"Tell me why\", \"Not me\", \"This is your sign\", \"no one talks about\", \"wait for it\", \"the way I\u2026\", \"stop scrolling\", \"I was today years old\". Build a tiny narrative across professional paragraphs. Land on a clear, useful lesson or insight other operators can take away. ALWAYS end with a thought-provoking question for the reader. Output must be plain prose paragraphs only \u2014 no markdown characters anywhere.",
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
      "Open with a small, relatable scene or moment. Keep it tight at 2-3 sentences. ALWAYS end with a question or a clear call-to-action that invites friends/community to chime in.",
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
      "Open with a strong hook in the first 5 words. End with a question or invitation to engage.",
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

const CAPTION_ARCHETYPES = `Caption 1 — PUNCHY HOOK: open with a scroll-stopping, PLATFORM-NATIVE hook in the first 5 words. The opener MUST match the platform's voice:
  • TikTok / Instagram / Threads / Bluesky / Twitter/X / Facebook: short-form openers are welcome — "POV:", "Tell me why", "Not me", "This is your sign", a bold claim, or a curiosity gap.
  • LinkedIn: NEVER use TikTok-style openers. The "punchy hook" on LinkedIn is a contrarian truth, a specific number, or a one-line confession — e.g. "I used to spend 30 minutes on a caption.", "Three years ago I quit a six-figure job.", "Most operators get this backwards.". NEVER write "POV:" or any short-form opener on LinkedIn.
  • YouTube / Pinterest: lead with a searchable, keyword-rich claim instead of a slang opener.
Energy is direct and punchy. Short and snappy where the platform allows it.

Caption 2 — STORY / LIFESTYLE MOMENT: open with a specific small moment or sensory detail. Build a tiny human story with concrete imagery, then end with a genuine question that invites the reader to share their own version. Warmer, more grounded, more emotional than Caption 1.

Caption 3 — CONTRARIAN INSIGHT / LESSON: open with a confident, slightly contrarian observation, a specific number, or a sharp lesson learned. Reads like something a real operator would screenshot. Ends on a clear takeaway or thought-provoking line.

CRITICAL RULE — ALL THREE MUST BE MEANINGFULLY DIFFERENT:
The three captions must feel like they were written by three different people. Different opener style, different rhythm, different sentence length, different vocabulary, different emotional register. Do NOT write three variations of the same line, the same vibe, or the same opening word. If two of them feel similar, rewrite one.`;

const QUALITY_RULES = `WHAT MAKES A GREAT CAPTION (apply to all three):

- HUMAN, NOT AI: write like a real person posting from their phone. Use contractions, casual phrasing, occasional sentence fragments, real-sounding rhythm. AVOID sentence patterns that scream ChatGPT: "In a world where...", "Imagine a place where...", "Whether you're a... or a...", "It's not just X, it's Y", "Let's dive in", "Buckle up". If a line sounds like a LinkedIn marketing template, rewrite it.
- The FIRST LINE must stop the scroll. No warm-ups, no "in today's post", no generic openers, no "Hey guys".
- SPECIFICS OVER GENERICS: use concrete details, real numbers, names of things, sensory imagery, real emotions. AVOID vague claims like "amazing", "best ever", "next level", "game-changer", "unlock potential", "synergy", "leverage", "level up", "elevate", "transform your life". Replace them with something specific.
- EMOTIONAL TRUTH: each caption should make the reader feel something real or recognize themselves in it. No fake hype, no manufactured urgency.
- Use power phrases sparingly but deliberately: "honestly", "actually", "the truth is", "POV:", "tell me why", "not me", "no one talks about", "this is your sign".
- Match the requested TONE exactly without breaking the platform voice.
- End with a CTA, question, or invitation phrased like a real human would say it. NEVER use "comment below!!", "double tap if you agree!", "smash that like button", "follow for more!!!".
- HASHTAGS must follow the platform's hashtag rules EXACTLY:
    \u2022 Instagram: 8-12 hashtags on a NEW LINE at the end (after a blank line).
    \u2022 TikTok: 3-5 hashtags, inline at the end is fine.
    \u2022 LinkedIn: maximum 2 hashtags. Often zero.
    \u2022 Twitter/X: 0 hashtags is best, maximum 1, and the WHOLE post must be \u2264 280 characters.
    \u2022 Facebook: 0-3 hashtags maximum.
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

const PRO_AMPLIFIERS = `PRO BOOST — ELITE COPYWRITING MODE:
You are now operating at the level of a top-tier social copywriter who has shipped viral content for major creators.

Pull from these advanced techniques across the three captions (do NOT use them all in one caption — pick what fits each archetype):
  • PATTERN INTERRUPT openers: "Stop scrolling.", "POV:", "Everyone gets this wrong.", "I was today years old when…"
  • OPEN LOOPS: introduce a thread or specific number that the reader has to keep reading to resolve ("3 things I learned…", "Here's the part nobody tells you about…").
  • SOCIAL PROOF baked in: small, believable specifics ("our 100,000th cup", "after 11 months testing this", "a regular told me…"). Never use round, made-up numbers.
  • CONTRAST and PARADOX: "I spent X on Y. The thing that actually worked cost nothing."
  • SENSORY ANCHORS: smells, sounds, weather, time-of-day. Pull the reader into a scene.
  • NICHE FLUENCY: use vocabulary a real insider in the topic's niche would use, not outsider-sounding words.
  • HASHTAG LADDER: for platforms that use hashtags, mix sizes — 1-2 broad reach tags, 2-3 mid-size, 3-5 niche specialist tags. All must be plausibly real and relevant.
  • CTA VARIETY: avoid "comment below". Use specific invitations ("tell me the version on your block", "save this for the next time you…", "tag the friend who…").

Tone of voice should feel like a confident, slightly mischievous insider who knows the niche cold. Each caption should be the kind of post a creator would screenshot and study.`;

function buildPrompt({
  topic,
  platform,
  tone,
  language,
  plan,
}: {
  topic: string;
  platform: string;
  tone: string;
  language: string;
  plan: Plan;
}): string {
  const profile = profileForPlatform(platform);
  const briefing = formatPlatformBriefing(profile);
  const isPro = plan === "pro";

  return `You are a top 1% social media copywriter who writes captions that real creators screenshot, save, and study. Your captions sound HUMAN, never AI-generated.

REQUEST
  Topic:    "${topic}"
  Platform: "${platform}"
  Tone:     "${tone}"
  Language: ${language}

PLATFORM BRIEFING for ${platform} (these constraints are non-negotiable)
${briefing}

${QUALITY_RULES}

THREE DISTINCT CAPTIONS
${CAPTION_ARCHETYPES}

${RATING_RUBRIC}
${isPro ? `\n${PRO_AMPLIFIERS}\n` : "\nSTANDARD MODE: write good, clean captions. Keep them grounded and natural. Use one strong technique per caption rather than stacking many.\n"}
BEFORE YOU RETURN, SELF-CHECK each caption against this checklist:
  1. Does it strictly match the ${platform} LENGTH rule above? (TikTok: 1-3 lines. Instagram: 3-5 sentences + hashtags on a new line. LinkedIn: 3-5 short paragraphs. Twitter/X: \u2264 280 characters total. Facebook: 2-3 sentences.)
  2. Does it strictly match the ${platform} HASHTAG count and placement rule? (TikTok 3-5, Instagram 8-12 on a NEW LINE with a blank line before them and ZERO hashtags inside the body copy, LinkedIn \u2264 2, Twitter/X 0-1, Facebook 0-3.)
  3. INSTAGRAM SPECIFIC: every hashtag MUST sit on the final line after a blank line. NO hashtag may appear inside any body sentence. The body and the hashtag block MUST be separated by \\n\\n. If even one hashtag is mixed into the prose, REWRITE.
  4. LINKEDIN SPECIFIC: contains ZERO markdown characters (no **, no *, no _, no \`, no ###) and ZERO TikTok-style openers ("POV:", "Tell me why", "Not me", "This is your sign", "Stop scrolling", "no one talks about", "wait for it", "I was today years old"). It MUST read as plain professional paragraphs only. If markdown or a TikTok opener is present, REWRITE.
  5. Does it end with a platform-appropriate question or CTA (where the platform calls for one)?
  6. Does it sound like a real human wrote it from their phone \u2014 not an AI? No "in a world where...", no "let's dive in", no "buckle up", no generic hype.
  7. Are the three captions MEANINGFULLY DIFFERENT from each other in style, rhythm, opener, and vocabulary?
  8. Did you apply the RATING RUBRIC honestly \u2014 NOT defaulting to "Caption 1 = best", NOT defaulting to "loudest opener = best", and genuinely picking the most engaging caption as "best"?
If any answer is no, rewrite that caption (or re-rate) before returning.

FINAL OUTPUT \u2014 return STRICT JSON ONLY, no markdown fences, no commentary, with this exact shape:
{
  "captions": ["caption 1 text", "caption 2 text", "caption 3 text"],
  "emojiPerCaption": [["emoji","emoji"], ["emoji"], ["emoji","emoji","emoji"]],
  "captionRatings": ["best"|"medium"|"worst", "best"|"medium"|"worst", "best"|"medium"|"worst"]
}

Requirements:
- captions has exactly 3 strings; each is the FULL caption text INCLUDING hashtags where the platform calls for them (Instagram hashtags on a new line at the end).
- captionRatings[i] rates captions[i]. Use "best", "medium", "worst" exactly once each across the three.
- emojiPerCaption has exactly 3 arrays of 2-4 single emoji characters (not words, not text) that fit each caption.
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
  if (!onInstagram && !onLinkedIn) return captions;

  return captions.map((cap) => {
    let next = cap;
    if (onLinkedIn) {
      next = stripLinkedInMarkdown(next);
    }
    if (onInstagram) {
      next = normalizeInstagramHashtagPlacement(next);
    }
    return next;
  });
}

const PARSE_RETRY_ATTEMPTS = 3;

const STRICT_JSON_SYSTEM =
  "You write elite-level social media captions. Output must be a single JSON object only — no markdown fences, no commentary, no text before or after the JSON.";

const CREATIVE_JSON_SYSTEM =
  "You write elite-level social media captions that real creators screenshot and save. Match platform voice exactly. Always return strict JSON when asked.";

async function fetchCaptionsFromGroq(
  groq: NonNullable<ReturnType<typeof getGroqClient>>,
  topic: string,
  platform: string,
  tone: string,
  language: string,
  plan: Plan,
  attempt: number
): Promise<string> {
  const strict = attempt > 0;
  const isPro = plan === "pro";
  const temperature = strict ? 0.5 : isPro ? 0.95 : 0.85;
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
          content: buildPrompt({ topic, platform, tone, language, plan }),
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
  userId: string
): Promise<ParsedCaptionResponse | null> {
  for (let attempt = 0; attempt < PARSE_RETRY_ATTEMPTS; attempt++) {
    const content = await fetchCaptionsFromGroq(groq, topic, platform, tone, language, plan, attempt);
    const parsed = parseCaptionModelJson(content);
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
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const topic = (body.topic ?? "").toString().trim();
  const platformRaw = (body.platform ?? "Instagram").toString();
  const platformCustom = (body.platformCustom ?? "").toString();
  const toneRaw = (body.tone ?? "inspirational").toString();
  const toneCustom = (body.toneCustom ?? "").toString();
  const language = (body.language ?? "English").toString().trim().slice(0, 40) || "English";

  const platform = resolvePlatform(platformRaw, platformCustom);
  const tone = resolveTone(toneRaw, toneCustom);

  if (!topic) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  const blockedList = getBlockedWordList();
  const blockedTopic = containsBlockedWord(topic, blockedList);
  if (blockedTopic) {
    return NextResponse.json(
      { error: "Your topic contains a blocked word. Please revise.", word: blockedTopic },
      { status: 400 }
    );
  }

  const today = getTodayDateString();

  const { data: subscriptionRow, error: subscriptionError } = await supabaseServer
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (subscriptionError) {
    await logAdminEvent("error", "subscription-read failed", { userId, details: subscriptionError.message });
    return NextResponse.json(
      {
        error:
          "Could not read subscription status. Check your Supabase key and make sure the subscriptions table exists.",
        stage: "subscription-read",
        details: subscriptionError.message,
      },
      { status: 500 }
    );
  }

  const plan: Plan = subscriptionRow?.plan === "pro" ? "pro" : "free";
  const proBoost = plan === "pro";

  if (!subscriptionRow) {
    await supabaseServer.from("subscriptions").insert({
      user_id: userId,
      plan: "free",
      updated_at: new Date().toISOString(),
    });
  }

  const { data: usageRow, error: usageReadError } = await supabaseServer
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (usageReadError) {
    await logAdminEvent("error", "usage-read failed", { userId, details: usageReadError.message });
    return NextResponse.json(
      {
        error:
          "Could not read daily usage. Check your Supabase key and make sure the usage table exists.",
        stage: "usage-read",
        details: usageReadError.message,
      },
      { status: 500 }
    );
  }

  const currentCount = usageRow?.count ?? 0;
  const freeLimit = 5;

  if (plan === "free" && currentCount >= freeLimit) {
    return NextResponse.json(
      {
        error: "Free plan limit reached.",
        paywall: true,
        plan,
        count: currentCount,
        limit: freeLimit,
      },
      { status: 402 }
    );
  }

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
  let emojiPerCaption: string[][] = [[], [], []];
  let captionRatings: CaptionRatingKey[] = defaultCaptionRatings();

  try {
    const parsed = await generateParsedCaptions(groq, topic, platform, tone, language, plan, userId);

    if (!parsed) {
      await logAdminEvent("error", "groq parse captions failed after retries", { userId });
      return NextResponse.json(
        { error: "AI response format was invalid. Please try again." },
        { status: 502 }
      );
    }

    captions = postProcessCaptions(parsed.captions, platform);
    emojiPerCaption = parsed.emojiPerCaption;
    captionRatings = parsed.captionRatings;

    for (const cap of captions) {
      const b = containsBlockedWord(cap, blockedList);
      if (b) {
        await logAdminEvent("warn", "blocked word in model output", { userId, word: b });
        return NextResponse.json(
          { error: "Generated text hit a safety filter. Try a different topic or tone.", word: b },
          { status: 400 }
        );
      }
    }

    const nextCount = currentCount + 1;
    const { error: usageWriteError } = await supabaseServer.from("usage").upsert(
      {
        user_id: userId,
        date: today,
        count: nextCount,
      },
      {
        onConflict: "user_id,date",
      }
    );

    if (usageWriteError) {
      await logAdminEvent("error", "usage-write failed", { userId, details: usageWriteError.message });
      return NextResponse.json(
        {
          error: "Could not update daily usage.",
          stage: "usage-write",
          details: usageWriteError.message,
        },
        { status: 500 }
      );
    }

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
      for (let i = 0; i < 3; i++) {
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

    return NextResponse.json({
      captions,
      emojiPerCaption,
      captionRatings,
      historyId,
      plan,
      proBoost,
      usage: {
        count: nextCount,
        limit: plan === "free" ? freeLimit : null,
        date: today,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown Groq API error.";
    await logAdminEvent("error", "groq-generate failed", { userId, details });
    return NextResponse.json(
      {
        error: "Could not generate AI captions with Groq. Check your GROQ_API_KEY.",
        stage: "groq-generate",
        details,
      },
      { status: 500 }
    );
  }
}
