import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { containsBlockedWord, getBlockedWordList } from "@/lib/blocked-words";
import { getGroqClient } from "@/lib/groq-client";
import { withGroqRetry } from "@/lib/groq-retry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePair(raw: string): { a: string; b: string } | null {
  try {
    const j = JSON.parse(raw) as { a?: string; b?: string };
    const a = j.a?.trim();
    const b = j.b?.trim();
    if (!a || !b) {
      return null;
    }
    return { a, b };
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
  const tone = (body.tone ?? "inspirational").toString().slice(0, 80);

  if (!topic) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  if (containsBlockedWord(topic, getBlockedWordList())) {
    return NextResponse.json({ error: "Topic contains a blocked word." }, { status: 400 });
  }

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json({ error: "AI unavailable." }, { status: 503 });
  }

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.95,
        max_tokens: 500,
        messages: [
          { role: "system", content: "Return strict JSON only." },
          {
            role: "user",
            content: `Two different caption variants for the SAME post (A/B test). Platform ${platform}, tone ${tone}. Topic: "${topic}". JSON: {"a":"variant A","b":"variant B"} — both must differ in hook or structure.`,
          },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const pair = parsePair(content);
    if (!pair) {
      return NextResponse.json({ error: "Could not parse A/B pair." }, { status: 502 });
    }
    for (const t of [pair.a, pair.b]) {
      const b = containsBlockedWord(t, getBlockedWordList());
      if (b) {
        return NextResponse.json({ error: "Output blocked by filter." }, { status: 400 });
      }
    }
    return NextResponse.json(pair);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
