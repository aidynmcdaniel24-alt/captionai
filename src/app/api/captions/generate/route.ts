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

const PLATFORM_GUIDANCE: Record<string, string> = {
  instagram:
    "Visually evocative, aspirational, 1-2 short paragraphs. Open with a strong hook in the first line, finish with 5-10 niche hashtags.",
  tiktok:
    "Punchy, trend-aware, hook in the first 5 words. Very short caption (1-2 lines) with 3-5 viral/niche hashtags, casual tone.",
  linkedin:
    "Professional but human storytelling. 2-4 short paragraphs with a clear insight or lesson; 3-5 industry hashtags at the end.",
  "twitter/x":
    "Under 280 characters total. Single tight thought, witty or punchy hook, 1-3 hashtags max. No filler.",
  facebook:
    "Casual, friendly, conversational like talking to a friend. Slightly longer is fine, end with a light question to invite comments. 2-4 hashtags max.",
  youtube:
    "Longer-form video description style: 2-4 paragraphs with relevant keywords for search, a call to subscribe/like, timestamps or chapter teasers if natural. 5-10 keyword-rich hashtags.",
  pinterest:
    "Descriptive, SEO-keyword-rich pin description. Lead with the main subject and benefit, include searchable phrases, 3-5 keyword hashtags.",
  threads:
    "Short, casual, conversational like a quick thought. 1-3 sentences, low-key tone, 0-3 hashtags only (Threads users use few hashtags).",
  bluesky:
    "Casual and conversational like Twitter but a bit looser. Under 300 characters, 0-2 hashtags max, personable voice.",
};

function platformGuidance(platform: string): string {
  const key = platform.trim().toLowerCase();
  const direct = PLATFORM_GUIDANCE[key];
  if (direct) {
    return direct;
  }
  return "Match the conventions of this platform's typical posts: appropriate length, voice, and hashtag count.";
}

function buildPrompt(topic: string, platform: string, tone: string, language: string) {
  return `
You are an expert social media copywriter.
Generate exactly 3 captions for this request.
Write in this language: ${language}.

Topic: "${topic}"
Platform: "${platform}"
Tone: "${tone}"

Platform style guide for ${platform}:
${platformGuidance(platform)}

Rules:
- Tailor each caption specifically to ${platform}'s style, length conventions, and audience behavior (see platform style guide above).
- Keep each caption unique and engaging.
- Match the requested tone exactly.
- Add relevant hashtags at the end of each caption, matching the hashtag conventions described in the platform style guide.
- Rank the three captions by predicted engagement for this platform: assign exactly one "best", one "medium", and one "worst" based on hook strength, hashtag fit, length appropriateness, and scroll-stopping potential.
- Return valid JSON only, with this exact shape:
{"captions":["caption 1","caption 2","caption 3"],"emojiPerCaption":[["emoji1","emoji2"],["emoji1"],["emoji1","emoji2","emoji3"]],"captionRatings":["worst"|"medium"|"best","worst"|"medium"|"best","worst"|"medium"|"best"]}
captionRatings[i] must rate captions[i]; use each of worst, medium, and best exactly once across the three captions (one best, one medium, one worst).
emojiPerCaption must have exactly 3 arrays (one per caption), each array has 2-4 relevant emoji characters (not words).
`;
}

const PARSE_RETRY_ATTEMPTS = 3;

const STRICT_JSON_SYSTEM =
  "You write high-quality social media captions. Output must be a single JSON object only—no markdown fences, no commentary, no text before or after the JSON.";

async function fetchCaptionsFromGroq(
  groq: NonNullable<ReturnType<typeof getGroqClient>>,
  topic: string,
  platform: string,
  tone: string,
  language: string,
  attempt: number
): Promise<string> {
  const strict = attempt > 0;
  const completion = await withGroqRetry(() =>
    groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: strict ? 0.5 : 0.9,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: strict ? STRICT_JSON_SYSTEM : "You write high-quality social media captions and always return strict JSON when asked.",
        },
        {
          role: "user",
          content: buildPrompt(topic, platform, tone, language),
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
  userId: string
): Promise<ParsedCaptionResponse | null> {
  for (let attempt = 0; attempt < PARSE_RETRY_ATTEMPTS; attempt++) {
    const content = await fetchCaptionsFromGroq(groq, topic, platform, tone, language, attempt);
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
    const parsed = await generateParsedCaptions(groq, topic, platform, tone, language, userId);

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
