import { NextResponse } from "next/server";
import {
  getBestTimeRecommendation,
  type BestTimeRecommendation,
} from "@/lib/best-time-recommendations";
import { bestTimeResearchBlock } from "@/lib/best-time-data";
import type { CaptionRatingKey } from "@/lib/caption-rating-styles";
import { guardTopic } from "@/lib/content-moderation";
import { getGroqClient } from "@/lib/groq-client";
import { extractJsonPayload } from "@/lib/groq-json";
import { withGroqRetry } from "@/lib/groq-retry";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import {
  readJsonWithLimit,
  REQUEST_SIZE_LIMITS,
} from "@/lib/security/request-size";
import { sanitizeText } from "@/lib/security/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAPTION_MAX = 2000;
const TOPIC_MAX = 500;
const MAX_ITEMS = 6;

type CaptionItem = {
  caption: string;
  rating: CaptionRatingKey;
};

function fallbackRecommendations(
  items: CaptionItem[],
  platform: string,
  topic: string,
  tone: string
): BestTimeRecommendation[] {
  return items.map((item) =>
    getBestTimeRecommendation({
      platform,
      topic,
      tone,
      caption: item.caption,
      rating: item.rating,
    })
  );
}

function parseRecommendations(
  raw: string,
  expected: number,
  fallback: BestTimeRecommendation[]
): BestTimeRecommendation[] | null {
  const payload = extractJsonPayload(raw);
  try {
    const j = JSON.parse(payload) as { recommendations?: unknown };
    if (!Array.isArray(j.recommendations) || j.recommendations.length !== expected) {
      return null;
    }
    const recs = j.recommendations.map((entry, i) => {
      const row = entry as {
        time?: unknown;
        reason?: unknown;
        stat?: unknown;
        confidence?: unknown;
      };
      const time = String(row.time ?? "").trim();
      const reason = String(row.reason ?? "").trim();
      const stat = String(row.stat ?? "").trim();
      const conf = String(row.confidence ?? "").trim();
      if (!time || time.length > 80 || !reason) return null;
      const confidence =
        conf === "High" || conf === "Medium" || conf === "Low"
          ? conf
          : fallback[i]?.confidence ?? "Medium";
      return {
        time,
        reason,
        stat: stat || fallback[i]?.stat || "Posts perform better in peak windows.",
        confidence,
      } satisfies BestTimeRecommendation;
    });
    if (recs.some((r) => r === null)) return null;
    return recs as BestTimeRecommendation[];
  } catch {
    return null;
  }
}

function isRating(v: unknown): v is CaptionRatingKey {
  return v === "worst" || v === "medium" || v === "best";
}

export async function POST(req: Request) {
  const authResult = await requireUser(req, "tools:best-time-captions");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "tools:best-time-captions",
    RATE_LIMITS.captionGenerate
  );
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate * 2
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const platform = sanitizeText(body.platform ?? "Instagram", { maxLength: 80 }) || "Instagram";
  const tone = sanitizeText(body.tone ?? "inspirational", { maxLength: 40 }) || "inspirational";
  const topic = sanitizeText(body.topic, { maxLength: TOPIC_MAX, allowLineBreaks: true });
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (rawItems.length === 0 || rawItems.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Provide 1–${MAX_ITEMS} captions.` }, { status: 400 });
  }

  const items: CaptionItem[] = [];
  for (const row of rawItems) {
    const rawRow = row as { caption?: unknown; rating?: unknown } | null;
    const caption = sanitizeText(rawRow?.caption, {
      maxLength: CAPTION_MAX,
      allowLineBreaks: true,
    });
    const rating = rawRow?.rating;
    if (!caption || !isRating(rating)) {
      return NextResponse.json({ error: "Each item needs caption and rating." }, { status: 400 });
    }
    items.push({ caption, rating });
  }

  const fallbacks = fallbackRecommendations(items, platform, topic, tone);

  if (topic) {
    const moderation = await guardTopic(topic, {
      userId,
      feature: "tools:best-time-captions",
    });
    if (!moderation.ok) return moderation.response;
  }

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json({ recommendations: fallbacks, times: fallbacks.map((r) => r.time) });
  }

  const lines = items
    .map(
      (item, i) =>
        `${i + 1}. [rating: ${item.rating}] "${item.caption.slice(0, 400)}${item.caption.length > 400 ? "…" : ""}"`
    )
    .join("\n");

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content: `You recommend optimal posting windows for individual social media captions, grounded in real engagement research. Reply with strict JSON only: {"recommendations":[{"time":"...","reason":"...","stat":"...","confidence":"High|Medium|Low"},...]}.

INDUSTRY ENGAGEMENT RESEARCH (Later, Sprout Social, Hootsuite) — use these as the foundation:
${bestTimeResearchBlock()}

TOPIC-SPECIFIC WINDOWS:
- Gym/fitness: early morning 5-7am and evening 6-8pm
- Food: 11am-1pm (lunch) and 5-7pm (dinner prep)
- Business/LinkedIn: Tuesday-Thursday 8-11am
- Entertainment/TikTok: evenings 7-10pm and weekends
- Travel: Friday evening and Saturday morning
- Fashion: weekday evenings 6-9pm

Rules:
- Return exactly ${items.length} objects in "recommendations", same order as captions.
- "time": SHORT badge text, e.g. "Tuesday 8pm – 9pm" (use en-dash –).
- "reason": ONE plain-English sentence explaining WHY this window works for this caption's topic and platform.
- "stat": ONE short data point, e.g. "Posts get 38% more reach." — realistic percentages 25-45%.
- "confidence": "High" for best-rated captions at peak windows, "Medium" for solid slots, "Low" for off-peak/experimental.
- Platform: ${platform}. Tone: ${tone}. Fine-tune using caption content.`,
          },
          {
            role: "user",
            content: `Topic context: ${topic || "(none)"}\nPlatform: ${platform}\nTone: ${tone}\n\nCaptions:\n${lines}\n\nReturn JSON with key "recommendations" only.`,
          },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const recommendations =
      parseRecommendations(content, items.length, fallbacks) ?? fallbacks;

    return NextResponse.json({
      recommendations,
      times: recommendations.map((r) => r.time),
    });
  } catch {
    return NextResponse.json({
      recommendations: fallbacks,
      times: fallbacks.map((r) => r.time),
    });
  }
}
