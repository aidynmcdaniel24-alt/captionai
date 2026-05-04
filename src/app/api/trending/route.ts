import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq-client";
import { withGroqRetry } from "@/lib/groq-retry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cacheTtlMs = 10 * 60 * 1000;
let cached: { at: number; topics: string[] } | null = null;

function parseTopics(raw: string): string[] | null {
  try {
    const j = JSON.parse(raw) as { topics?: string[] };
    if (!j.topics || !Array.isArray(j.topics)) {
      return null;
    }
    return j.topics.map((t) => String(t).trim()).filter(Boolean).slice(0, 12);
  } catch {
    return null;
  }
}

export async function GET() {
  const now = Date.now();
  if (cached && now - cached.at < cacheTtlMs) {
    return NextResponse.json({ topics: cached.topics, cached: true });
  }

  const groq = getGroqClient();
  if (!groq) {
    const fallback = [
      "Sunday reset routines",
      "Small business behind-the-scenes",
      "Travel photo dumps",
      "Product launch teasers",
      "Creator morning routines",
    ];
    return NextResponse.json({ topics: fallback, cached: false, source: "fallback" });
  }

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.75,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content: "You return only valid JSON for social media trend ideas.",
          },
          {
            role: "user",
            content: `List 10 short trend topic ideas for social media creators this week (not hashtags, just topics). Return JSON: {"topics":["..."]}`,
          },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const topics = parseTopics(content);
    if (!topics || topics.length === 0) {
      return NextResponse.json({ topics: ["Lifestyle photo dumps", "Day-in-the-life vlogs"], cached: false });
    }
    cached = { at: now, topics };
    return NextResponse.json({ topics, cached: false });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Trending failed";
    return NextResponse.json({ error: message, topics: [] }, { status: 500 });
  }
}
