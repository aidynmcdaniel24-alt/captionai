import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { guardTopic } from "@/lib/content-moderation";
import { getGroqClient } from "@/lib/groq-client";
import { withGroqRetry } from "@/lib/groq-retry";
import {
  RATE_LIMITS,
  rateLimitByIp,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import {
  readJsonWithLimit,
  REQUEST_SIZE_LIMITS,
} from "@/lib/security/request-size";
import { sanitizeText } from "@/lib/security/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const rateLimited = rateLimitByIp(
    req,
    "captions:demo",
    RATE_LIMITS.demo,
    "Demo limit reached for now. Create a free account for more captions."
  );
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const topic = sanitizeText(body.topic, { maxLength: 400, allowLineBreaks: true });
  const platform = sanitizeText(body.platform ?? "Instagram", { maxLength: 80 }) || "Instagram";
  const tone = sanitizeText(body.tone ?? "inspirational", { maxLength: 80 }) || "inspirational";

  if (!topic) {
    return NextResponse.json(
      { error: "Describe your topic in a few words (max 400 characters)." },
      { status: 400 }
    );
  }

  // Demo endpoint is anonymous — pass whatever Clerk user id is available
  // (if any) so we can correlate admin logs but never block on auth.
  const { userId: maybeUserId } = await auth();
  const moderation = await guardTopic(topic, {
    userId: maybeUserId ?? null,
    feature: "captions:demo",
  });
  if (!moderation.ok) return moderation.response;

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json(
      { error: "Caption demo is temporarily unavailable." },
      { status: 503 }
    );
  }

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
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
      })
    );

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
    return NextResponse.json(
      { error: "Could not generate a caption right now.", details: safeErrorMessage(error, "AI service error.") },
      { status: 500 }
    );
  }
}
