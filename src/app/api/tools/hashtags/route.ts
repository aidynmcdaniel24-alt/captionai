import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { containsBlockedWord, getBlockedWordList } from "@/lib/blocked-words";
import { getGroqClient } from "@/lib/groq-client";
import { withGroqRetry } from "@/lib/groq-retry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseHashtags(raw: string): string[] | null {
  try {
    const j = JSON.parse(raw) as { hashtags?: string[] };
    if (!j.hashtags?.length) {
      return null;
    }
    return j.hashtags.map((h) => String(h).trim()).filter(Boolean).slice(0, 30);
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
  const platform = (body.platform ?? "Instagram").toString().slice(0, 80);
  const count = Math.min(20, Math.max(5, Number(body.count) || 12));

  if (!topic) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  const blocked = containsBlockedWord(topic, getBlockedWordList());
  if (blocked) {
    return NextResponse.json({ error: "Topic contains a blocked word.", word: blocked }, { status: 400 });
  }

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json({ error: "AI unavailable." }, { status: 503 });
  }

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.85,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You generate social media hashtag sets. Output must be a single JSON object only — no markdown fences, no commentary, no text before or after the JSON.",
          },
          {
            role: "user",
            content: `Generate ${count} relevant hashtags (with #) for the topic: "${topic}" on ${platform}. Mix broad-reach and niche tags. Return JSON exactly in this shape: {"hashtags":["#tag1","#tag2"]}`,
          },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const hashtags = parseHashtags(content);
    if (!hashtags) {
      return NextResponse.json({ error: "Could not parse hashtags." }, { status: 502 });
    }
    return NextResponse.json({ hashtags });
  } catch (e) {
    const details = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: details }, { status: 500 });
  }
}
