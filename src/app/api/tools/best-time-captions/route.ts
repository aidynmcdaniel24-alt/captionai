import { NextResponse } from "next/server";
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

function parseTimes(raw: string, expected: number): string[] | null {
  const payload = extractJsonPayload(raw);
  try {
    const j = JSON.parse(payload) as { times?: unknown };
    if (!Array.isArray(j.times) || j.times.length !== expected) {
      return null;
    }
    const times = j.times.map((t) => {
      const s = String(t ?? "").trim();
      if (!s || s.length > 80) {
        return null;
      }
      return s;
    });
    if (times.some((t) => t === null)) {
      return null;
    }
    return times as string[];
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

  if (topic) {
    const moderation = await guardTopic(topic, {
      userId,
      feature: "tools:best-time-captions",
    });
    if (!moderation.ok) return moderation.response;
  }

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json({ error: "AI unavailable." }, { status: 503 });
  }

  const lines = items
    .map(
      (item, i) =>
        `${i + 1}. [rating: ${item.rating}] "${item.caption.slice(0, 400)}${item.caption.length > 400 ? "…" : ""}"`,
    )
    .join("\n");

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 450,
        messages: [
          {
            role: "system",
            content: `You recommend optimal posting windows for individual social media captions. Reply with strict JSON only: {"times":["...","..."]}.

Rules:
- Return exactly ${items.length} strings in "times", same order as the captions.
- Each string is SHORT for a UI badge: a day or day-range plus a time window, e.g. "Tuesday 7pm – 9pm" or "Weekday 9am – 11am". No sentences, no timezone lectures.
- Use the caption content/topic to infer when the audience cares (morning coffee, weekend adventure, work tips, etc.).
- Platform: ${platform} — respect its norms (LinkedIn weekday mornings; TikTok/Instagram evenings for lifestyle; Twitter/X mornings and lunch).
- Tone: ${tone} — funny/hype/inspirational skew evenings and weekends; professional skew weekday business hours.
- Rating: "best" captions get prime peak-engagement slots; "medium" get solid but not peak; "worst" get off-peak or experimental slots.
- Use en-dash (–) between times. English only.`,
          },
          {
            role: "user",
            content: `Topic context: ${topic || "(none)"}\nPlatform: ${platform}\nTone: ${tone}\n\nCaptions:\n${lines}\n\nReturn JSON with key "times" only.`,
          },
        ],
      }),
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const times = parseTimes(content, items.length);
    if (!times) {
      return NextResponse.json({ error: "Could not parse AI response." }, { status: 502 });
    }
    return NextResponse.json({ times });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not generate posting times.") },
      { status: 500 }
    );
  }
}
