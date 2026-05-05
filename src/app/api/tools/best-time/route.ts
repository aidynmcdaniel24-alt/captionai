import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { containsBlockedWord, getBlockedWordList } from "@/lib/blocked-words";
import { getGroqClient } from "@/lib/groq-client";
import { withGroqRetry } from "@/lib/groq-retry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOPIC_MAX = 500;

function extractJsonPayload(raw: string): string {
  const s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```/m;
  const m = s.match(fence);
  return m ? m[1].trim() : s;
}

function parseBestTime(raw: string): string | null {
  const payload = extractJsonPayload(raw);
  try {
    const j = JSON.parse(payload) as { bestTime?: string };
    const text = j.bestTime?.toString().trim();
    if (!text || text.length > 1200) {
      return null;
    }
    return text;
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
  const topic = (body.topic ?? "").toString().trim().slice(0, TOPIC_MAX);
  const platform = (body.platform ?? "Instagram").toString().trim().slice(0, 80) || "Instagram";

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
        temperature: 0.45,
        max_tokens: 350,
        messages: [
          {
            role: "system",
            content:
              'You suggest when to publish social posts. Reply with strict JSON only: {"bestTime":"..."}. The bestTime string must be 1–3 short sentences in English. Infer realistic posting windows from the TOPIC (time of day, habits, when the audience thinks about that content). Also respect the PLATFORM (e.g. LinkedIn weekday mornings; TikTok/Instagram evenings for lifestyle). Use the viewer\'s local timezone phrasing (e.g. "your audience\'s local morning"). No markdown, no bullet lists inside the JSON string.',
          },
          {
            role: "user",
            content: `Platform: ${platform}\nTopic / content: "${topic}"\n\nReturn JSON with key bestTime only.`,
          },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const bestTime = parseBestTime(content);
    if (!bestTime) {
      return NextResponse.json({ error: "Could not parse AI response." }, { status: 502 });
    }
    return NextResponse.json({ bestTime });
  } catch (e) {
    const details = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: details }, { status: 500 });
  }
}
