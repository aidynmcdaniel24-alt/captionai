import { NextResponse } from "next/server";
import { bestTimeForPlatform, bestTimeResearchBlock } from "@/lib/best-time-data";
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

const TOPIC_MAX = 500;

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
  const authResult = await requireUser(req, "tools:best-time");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "tools:best-time", RATE_LIMITS.captionGenerate);
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const topic = sanitizeText(body.topic, { maxLength: TOPIC_MAX, allowLineBreaks: true });
  const platform = sanitizeText(body.platform ?? "Instagram", { maxLength: 80 }) || "Instagram";

  if (!topic) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  const moderation = await guardTopic(topic, {
    userId,
    feature: "tools:best-time",
  });
  if (!moderation.ok) return moderation.response;

  const research = bestTimeForPlatform(platform);
  const fallbackBestTime = research
    ? `${research.windows[0]}. ${research.reason}`
    : null;

  const groq = getGroqClient();
  if (!groq) {
    // No AI available — return the research-backed window so the user still
    // gets a data-driven recommendation with a reason.
    if (fallbackBestTime) {
      return NextResponse.json({ bestTime: fallbackBestTime, source: "research" });
    }
    return NextResponse.json({ error: "AI unavailable." }, { status: 503 });
  }

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 350,
        messages: [
          {
            role: "system",
            content:
              'You suggest when to publish social posts using real engagement research. Reply with strict JSON only: {"bestTime":"..."}. The bestTime string must be 1–3 short sentences in English and MUST state BOTH the recommended day/time window AND a one-line reason WHY (cite the platform engagement pattern). Start from the research-backed windows provided, then fine-tune slightly based on the TOPIC (when that specific audience is active). No markdown, no bullet lists inside the JSON string.',
          },
          {
            role: "user",
            content: `INDUSTRY ENGAGEMENT RESEARCH (Later, Sprout Social, Hootsuite):\n${bestTimeResearchBlock()}\n\nPlatform: ${platform}\nTopic / content: "${topic}"\n\nUsing the research above as the foundation, return JSON with key bestTime only. Include the specific window AND the reason.`,
          },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const bestTime = parseBestTime(content);
    if (!bestTime) {
      if (fallbackBestTime) {
        return NextResponse.json({ bestTime: fallbackBestTime, source: "research" });
      }
      return NextResponse.json({ error: "Could not parse AI response." }, { status: 502 });
    }
    return NextResponse.json({ bestTime, source: "ai" });
  } catch (e) {
    if (fallbackBestTime) {
      return NextResponse.json({ bestTime: fallbackBestTime, source: "research" });
    }
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not generate best time.") },
      { status: 500 }
    );
  }
}
