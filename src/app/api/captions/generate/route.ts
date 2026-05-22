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

const PLATFORM_PROFILES: Record<string, PlatformProfile> = {
  instagram: {
    voice:
      "Visual storytelling. Lifestyle-focused, aspirational but human. Sensory details and small specifics that paint a picture.",
    length:
      "3-5 short lines of body copy with line breaks for breathing room, then a blank line, then hashtags on the last line.",
    hashtags:
      "5-10 niche-leaning hashtags. Mix one or two slightly bigger reach tags with mostly niche ones. Lowercase, no spaces.",
    notes:
      "Open with a hook that creates a feeling or a scene in the first 5 words. End with a soft question or invitation to comment. Avoid corporate buzzwords.",
    examples: [
      "6am. Fog still on the river. The espresso machine is the loudest thing in the room.\n\nThis is the version of the city only the early ones see.\n\nWhat hour does your favorite version of your city start?\n\n#neworleansliving #slowmornings #cafeculture #espresso #thirdwavecoffee #morningritual #nolaeats",
      "POV: you ordered the cortado but stayed for the playlist.\n\nWe didn't plan a vibe. We just played the records we love and somehow strangers started staying for hours.\n\nTell me a place that did that to you.\n\n#coffeeshopvibes #cortado #nolacafe #independentcoffee #vinylcommunity #localfinds #neworleans",
    ],
  },
  tiktok: {
    voice:
      "Gen Z native. Trending phrasing, often lowercase, slightly chaotic energy. No corporate speak, ever. Use pattern interrupts like 'pov:', 'no one talks about', 'wait for it', 'tell me why', 'the way I…'.",
    length:
      "1-3 short lines maximum. The first 5 words must stop the scroll. Total under ~150 characters before hashtags.",
    hashtags:
      "3-5 tags. Mix one broad (#fyp / #foryou) with 2-3 niche tags that match the actual content. Lowercase, no spaces.",
    notes:
      "Curiosity gap or pattern interrupt up front. Reward the scroll with a punchline, twist, or callout. Sound like a friend texting, not a brand.",
    examples: [
      "no one talks about how the third-wave coffee crowd is just a book club in disguise 📚☕ #fyp #coffeetok #thirdwave",
      "pov: the locals tried to gatekeep this café and you found it anyway 👀 #fyp #neworleans #cafehopping #hiddengems",
    ],
  },
  linkedin: {
    voice:
      "Professional but human. Thought leadership through story, not jargon. Specific numbers, specific moments, specific lessons. First-person.",
    length:
      "Longer form, 4-8 short paragraphs of 1-2 sentences each, generous line breaks. Opens with a single bold first line that doubles as the LinkedIn preview hook.",
    hashtags:
      "0-2 hashtags maximum. Industry-relevant, CamelCase or lowercase. Often best to skip hashtags entirely.",
    notes:
      "Open with a contrarian truth, a specific number, or a vulnerable moment. Build a tiny narrative. Land on an insight that's useful to other operators. End with a reflective question.",
    examples: [
      "Three years ago I quit a six-figure engineering job to open a coffee shop in New Orleans.\n\nLast Tuesday a customer cried at the bar because the espresso reminded her of her father.\n\nThe spreadsheet measures revenue.\n\nThe relationships measure why we're really here.\n\nNo business plan ever has a line item for 'reminded a stranger of someone they loved.' But maybe it should.\n\nWhat's the most unexpected metric your work actually changes?",
      "I spent 11 months optimizing our pricing model.\n\nThen a regular told me she comes in three times a week because we remember her dog's name.\n\nWe weren't competing on price. We were competing on belonging.\n\nMost businesses get this backwards.",
    ],
  },
  "twitter/x": {
    voice:
      "Witty, tight, opinionated. One single thought, sharpened to a point. Often a contrarian take or a clean observation. Conversational lowercase is fine.",
    length:
      "Under 280 characters total, hashtags included. Aim for under 240 for shareability. One line, occasionally two.",
    hashtags:
      "0-2 hashtags max. Usually 0. If used, lowercase and topical, not generic.",
    notes:
      "No filler words. The hook IS the post. Should feel like a quote you'd screenshot.",
    examples: [
      "the most underrated business strategy is remembering people's names.",
      "you don't need a brand. you need a regular Tuesday that people miss when it's gone.",
    ],
  },
  twitter: {
    voice:
      "Witty, tight, opinionated. One single thought, sharpened to a point. Often a contrarian take or a clean observation. Conversational lowercase is fine.",
    length:
      "Under 280 characters total, hashtags included. Aim for under 240 for shareability. One line, occasionally two.",
    hashtags:
      "0-2 hashtags max. Usually 0. If used, lowercase and topical, not generic.",
    notes:
      "No filler words. The hook IS the post. Should feel like a quote you'd screenshot.",
    examples: [
      "the most underrated business strategy is remembering people's names.",
      "you don't need a brand. you need a regular Tuesday that people miss when it's gone.",
    ],
  },
  x: {
    voice:
      "Witty, tight, opinionated. One single thought, sharpened to a point. Often a contrarian take or a clean observation. Conversational lowercase is fine.",
    length:
      "Under 280 characters total, hashtags included. Aim for under 240 for shareability. One line, occasionally two.",
    hashtags:
      "0-2 hashtags max. Usually 0. If used, lowercase and topical, not generic.",
    notes:
      "No filler words. The hook IS the post. Should feel like a quote you'd screenshot.",
    examples: [
      "the most underrated business strategy is remembering people's names.",
      "you don't need a brand. you need a regular Tuesday that people miss when it's gone.",
    ],
  },
  facebook: {
    voice:
      "Conversational, community-focused, like talking to neighbors. Warmer, slightly longer, gently sentimental is OK.",
    length:
      "Medium length, 2-4 short paragraphs. Friendly and personable, not corporate.",
    hashtags:
      "0-3 hashtags max. Local or community-relevant. Many Facebook posts use none at all.",
    notes:
      "Open with a relatable scene or a small story. End with a clear question that invites neighbors to comment with their own version.",
    examples: [
      "Funny thing about running a corner café: you start by selling coffee and end up knowing who in the neighborhood just had a baby, who's grieving, and who finally got the promotion.\n\nWe poured our 100,000th cup last week.\n\nThanks for letting us be part of your week. Who's a small business that's been part of yours?",
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

const CAPTION_ARCHETYPES = `Caption 1 — HOOK OPENER: open with a scroll-stopping line in the first 5 words. Curiosity gap, bold claim, or pattern interrupt. The rest of the caption pays off that hook.

Caption 2 — STORY / QUESTION: open with a specific small moment, micro-story, or genuine question that builds emotional connection. Reward the reader with a relatable insight, then invite them to share their own version.

Caption 3 — BOLD / CONTRARIAN: open with a confident, slightly contrarian take or strong statement that gives the reader a reason to nod, screenshot, or argue. End sharp.`;

const QUALITY_RULES = `WHAT MAKES A GREAT CAPTION (apply to all three):
- The FIRST LINE must stop the scroll. No warm-ups, no "in today's post", no generic openers.
- Conversational, authentic, human voice. No corporate speak, no buzzwords like "synergy", "leverage", "unlock potential". No vague claims like "amazing", "best ever", "next level" unless used with irony.
- Use specific, concrete details (numbers, names of things, sensory imagery) over abstractions.
- Use power words sparingly but deliberately (e.g. "secret", "honestly", "finally", "actually", "the truth is", "POV:", "imagine").
- Match the requested tone exactly without breaking the platform voice.
- Be emotionally engaging: make the reader feel something or recognize themselves in it.
- End with a CTA, question, or invitation that gives the reader a clear next action (comment, share, save, click, etc.) — phrased naturally, not "comment below!!".
- Hashtags must follow the platform's hashtag rules exactly (count, casing, niche vs broad mix). No banned or generic spam tags.`;

const RATING_RUBRIC = `RATING RUBRIC (you must apply this honestly):
Score each caption internally on:
  • Scroll-stopping power of the FIRST line (40%)
  • Emotional engagement / relatability (20%)
  • Call-to-action strength (15%)
  • Platform fit — length, voice, format (15%)
  • Hashtag quality — count, niche-fit, casing (10%)
Then assign labels: the highest-scoring caption gets "best", the lowest gets "worst", and the remaining one gets "medium". You MUST use each of "best", "medium", and "worst" exactly once.
Do NOT default the order. Genuinely judge.`;

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

  return `You are a top 1% social media copywriter who writes captions creators actually screenshot and save.

REQUEST
  Topic:    "${topic}"
  Platform: "${platform}"
  Tone:     "${tone}"
  Language: ${language}

PLATFORM BRIEFING for ${platform}
${briefing}

${QUALITY_RULES}

THREE DISTINCT CAPTIONS (the three MUST feel meaningfully different from each other — different opener style, different rhythm, different angle. Do NOT write three variations of the same line.):
${CAPTION_ARCHETYPES}

${RATING_RUBRIC}
${isPro ? `\n${PRO_AMPLIFIERS}\n` : "\nSTANDARD MODE: write good, clean captions. Keep them grounded and natural. Use one strong technique per caption rather than stacking many.\n"}
FINAL OUTPUT — return STRICT JSON ONLY, no markdown fences, no commentary, with this exact shape:
{
  "captions": ["caption 1 text", "caption 2 text", "caption 3 text"],
  "emojiPerCaption": [["emoji","emoji"], ["emoji"], ["emoji","emoji","emoji"]],
  "captionRatings": ["best"|"medium"|"worst", "best"|"medium"|"worst", "best"|"medium"|"worst"]
}

Requirements:
- captions has exactly 3 strings; each is the full caption text INCLUDING hashtags where appropriate.
- captionRatings[i] rates captions[i]. Use "best", "medium", "worst" exactly once each across the three.
- emojiPerCaption has exactly 3 arrays of 2-4 single emoji characters (not words, not text) that fit each caption.
- Write all caption text in ${language}.`;
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

    captions = parsed.captions;
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
