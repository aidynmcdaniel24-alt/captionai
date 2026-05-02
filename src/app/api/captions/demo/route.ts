import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rolling window rate limit for anonymous demo (best-effort per server instance). */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function allowDemo(ip: string) {
  const now = Date.now();
  const prev = hits.get(ip)?.filter((t) => now - t < WINDOW_MS) ?? [];
  if (prev.length >= MAX_PER_WINDOW) {
    return false;
  }
  prev.push(now);
  hits.set(ip, prev);
  return true;
}

function buildDemoPrompt(topic: string, platform: string, tone: string) {
  return `
You are an expert social media copywriter.
Generate exactly ONE short caption for this request (one paragraph, engaging, platform-appropriate).

Topic: "${topic}"
Platform: "${platform}"
Tone: "${tone}"

Rules:
- Include relevant hashtags at the end.
- Return valid JSON only with this exact shape:
{"caption":"your caption here"}
`;
}

function parseDemoCaption(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { caption?: string };
    const cap = parsed.caption?.trim();
    if (!cap) {
      return null;
    }
    return cap;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!allowDemo(ip)) {
    return NextResponse.json(
      {
        error:
          "Demo limit reached for now. Create a free account for more captions.",
      },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const topic = (body.topic ?? "").toString().trim();
  const platform = (body.platform ?? "Instagram").toString().slice(0, 80);
  const tone = (body.tone ?? "inspirational").toString().slice(0, 80);

  if (!topic || topic.length > 400) {
    return NextResponse.json(
      { error: "Describe your topic in a few words (max 400 characters)." },
      { status: 400 }
    );
  }

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json(
      { error: "Caption demo is temporarily unavailable." },
      { status: 503 }
    );
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.85,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: "You write social media captions and return strict JSON when asked.",
        },
        {
          role: "user",
          content: buildDemoPrompt(topic, platform, tone),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const caption = parseDemoCaption(content);

    if (!caption) {
      return NextResponse.json(
        { error: "Could not parse the AI response. Try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ caption });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Could not generate a caption right now.", details },
      { status: 500 }
    );
  }
}
