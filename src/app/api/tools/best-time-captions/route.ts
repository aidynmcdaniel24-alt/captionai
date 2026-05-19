import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { CaptionRatingKey } from "@/lib/caption-rating-styles";
import { containsBlockedWord, getBlockedWordList } from "@/lib/blocked-words";
import { getGroqClient } from "@/lib/groq-client";
import { extractJsonPayload } from "@/lib/groq-json";
import { withGroqRetry } from "@/lib/groq-retry";

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
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const platform = (body.platform ?? "Instagram").toString().trim().slice(0, 80) || "Instagram";
  const tone = (body.tone ?? "inspirational").toString().trim().slice(0, 40) || "inspirational";
  const topic = (body.topic ?? "").toString().trim().slice(0, TOPIC_MAX);
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (rawItems.length === 0 || rawItems.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Provide 1–${MAX_ITEMS} captions.` }, { status: 400 });
  }

  const items: CaptionItem[] = [];
  for (const row of rawItems) {
    const caption = (row?.caption ?? "").toString().trim().slice(0, CAPTION_MAX);
    const rating = row?.rating;
    if (!caption || !isRating(rating)) {
      return NextResponse.json({ error: "Each item needs caption and rating." }, { status: 400 });
    }
    items.push({ caption, rating });
  }

  const blockedList = getBlockedWordList();
  for (const item of items) {
    const blocked = containsBlockedWord(item.caption, blockedList);
    if (blocked) {
      return NextResponse.json({ error: "Caption contains a blocked word.", word: blocked }, { status: 400 });
    }
  }
  if (topic) {
    const blocked = containsBlockedWord(topic, blockedList);
    if (blocked) {
      return NextResponse.json({ error: "Topic contains a blocked word.", word: blocked }, { status: 400 });
    }
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
    const details = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: details }, { status: 500 });
  }
}
