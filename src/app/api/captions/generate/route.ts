import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { logAdminEvent } from "@/lib/admin-log";
import { containsBlockedWord, getBlockedWordList } from "@/lib/blocked-words";
import { getGroqClient } from "@/lib/groq-client";
import { withGroqRetry } from "@/lib/groq-retry";
import type { CaptionRatingKey } from "@/lib/caption-rating-styles";
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

function buildPrompt(topic: string, platform: string, tone: string, language: string) {
  return `
You are an expert social media copywriter.
Generate exactly 3 captions for this request.
Write in this language: ${language}.

Topic: "${topic}"
Platform: "${platform}"
Tone: "${tone}"

Rules:
- Make each caption platform-specific.
- Keep each caption unique and engaging.
- Match tone exactly.
- Add relevant hashtags at the end of each caption.
- Rank the three captions by predicted engagement for this platform: assign exactly one "best", one "medium", and one "worst" based on hook strength, hashtag fit, length appropriateness, and scroll-stopping potential.
- Return valid JSON only, with this exact shape:
{"captions":["caption 1","caption 2","caption 3"],"emojiPerCaption":[["emoji1","emoji2"],["emoji1"],["emoji1","emoji2","emoji3"]],"captionRatings":["worst"|"medium"|"best","worst"|"medium"|"best","worst"|"medium"|"best"]}
captionRatings[i] must rate captions[i]; use each of worst, medium, and best exactly once across the three captions (one best, one medium, one worst).
emojiPerCaption must have exactly 3 arrays (one per caption), each array has 2-4 relevant emoji characters (not words).
`;
}

type Parsed = { captions: string[]; emojiPerCaption: string[][]; captionRatings: CaptionRatingKey[] };

const RATING_SET = new Set<CaptionRatingKey>(["worst", "medium", "best"]);

function normalizeCaptionRatings(raw: unknown): CaptionRatingKey[] | null {
  if (!Array.isArray(raw) || raw.length !== 3) {
    return null;
  }
  const labels = raw.map((x) => String(x).trim().toLowerCase()) as CaptionRatingKey[];
  const set = new Set(labels);
  if (set.size !== 3) {
    return null;
  }
  for (const r of RATING_SET) {
    if (!set.has(r)) {
      return null;
    }
  }
  return labels;
}

function defaultCaptionRatings(): CaptionRatingKey[] {
  return ["medium", "worst", "best"];
}

function parseModelJson(raw: string): Parsed | null {
  try {
    const parsed = JSON.parse(raw) as {
      captions?: string[];
      emojiPerCaption?: string[][];
      captionRatings?: unknown;
    };
    if (!parsed.captions || parsed.captions.length !== 3) {
      return null;
    }
    const captions = parsed.captions.map((item) => item.trim()).filter(Boolean);
    if (captions.length !== 3) {
      return null;
    }
    let emojiPerCaption: string[][] =
      Array.isArray(parsed.emojiPerCaption) && parsed.emojiPerCaption.length === 3
        ? parsed.emojiPerCaption.map((row) =>
            (Array.isArray(row) ? row : []).map((e) => String(e).trim()).filter(Boolean)
          )
        : [[], [], []];
    while (emojiPerCaption.length < 3) {
      emojiPerCaption.push([]);
    }
    const captionRatings = normalizeCaptionRatings(parsed.captionRatings) ?? defaultCaptionRatings();
    return { captions, emojiPerCaption: emojiPerCaption.slice(0, 3), captionRatings };
  } catch {
    return null;
  }
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
  const tone = (body.tone ?? "inspirational").toString();
  const language = (body.language ?? "English").toString().trim().slice(0, 40) || "English";

  const platform = resolvePlatform(platformRaw, platformCustom);

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
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content:
              "You write high-quality social media captions and always return strict JSON when asked.",
          },
          {
            role: "user",
            content: buildPrompt(topic, platform, tone, language),
          },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = parseModelJson(content);

    if (!parsed) {
      await logAdminEvent("warn", "groq parse captions invalid JSON", { userId });
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
