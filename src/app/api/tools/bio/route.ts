import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { containsBlockedWord, getBlockedWordList } from "@/lib/blocked-words";
import { getGroqClient } from "@/lib/groq-client";
import { withGroqRetry } from "@/lib/groq-retry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseBio(raw: string): string | null {
  try {
    const j = JSON.parse(raw) as { bio?: string };
    const b = j.bio?.trim();
    return b || null;
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
  const about = (body.about ?? "").toString().trim();
  const platform = (body.platform ?? "Instagram").toString().slice(0, 80);
  const tone = (body.tone ?? "professional").toString().slice(0, 80);

  if (!about) {
    return NextResponse.json({ error: "Tell us about you or your brand." }, { status: 400 });
  }

  const blocked = containsBlockedWord(about, getBlockedWordList());
  if (blocked) {
    return NextResponse.json({ error: "Text contains a blocked word.", word: blocked }, { status: 400 });
  }

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json({ error: "AI unavailable." }, { status: 503 });
  }

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
        max_tokens: 500,
        messages: [
          { role: "system", content: "You write social bios and return strict JSON." },
          {
            role: "user",
            content: `Write ONE concise profile bio for ${platform} with tone: ${tone}.
About: "${about}"
Max ~160 characters where appropriate for the platform. JSON: {"bio":"..."}`,
          },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const bio = parseBio(content);
    if (!bio) {
      return NextResponse.json({ error: "Could not parse bio." }, { status: 502 });
    }
    return NextResponse.json({ bio });
  } catch (e) {
    const details = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: details }, { status: 500 });
  }
}
