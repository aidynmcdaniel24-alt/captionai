import { NextResponse } from "next/server";
import { guardTopic } from "@/lib/content-moderation";
import { getGroqClient } from "@/lib/groq-client";
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
import { spendTokens, TOKEN_COSTS, tokenInfoPayload } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STYLES = [
  "Hook-based",
  "Story-based",
  "Question-based",
  "Contrarian",
  "List/Tips",
  "Statistic-driven",
  "Promotional",
  "Behind-the-scenes",
  "Quote",
  "How-to",
] as const;
type Style = (typeof ALLOWED_STYLES)[number];

function normalizeStyle(value: unknown): Style {
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    for (const s of ALLOWED_STYLES) {
      if (s.toLowerCase() === lower) return s;
    }
  }
  return "Hook-based";
}

function parsePair(
  raw: string
): { a: string; b: string; styleA: Style; styleB: Style } | null {
  try {
    const j = JSON.parse(raw) as {
      a?: string;
      b?: string;
      styleA?: string;
      styleB?: string;
    };
    const a = j.a?.trim();
    const b = j.b?.trim();
    if (!a || !b) {
      return null;
    }
    return {
      a,
      b,
      styleA: normalizeStyle(j.styleA),
      styleB: normalizeStyle(j.styleB),
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const authResult = await requireUser(req, "tools:ab-pair");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "tools:ab-pair", RATE_LIMITS.captionGenerate);
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const topic = sanitizeText(body.topic, { maxLength: 500, allowLineBreaks: true });
  const platform = sanitizeText(body.platform ?? "Instagram", { maxLength: 80 });
  const tone = sanitizeText(body.tone ?? "inspirational", { maxLength: 80 });

  if (!topic) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  const moderation = await guardTopic(topic, {
    userId,
    feature: "tools:ab-pair",
  });
  if (!moderation.ok) return moderation.response;

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json({ error: "AI unavailable." }, { status: 503 });
  }

  const spend = await spendTokens(userId, TOKEN_COSTS.abTest, "tools:ab-pair");
  if (!spend.ok) {
    return spend.response;
  }

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.95,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write social media captions for A/B testing. Output must be a single JSON object only — no markdown fences, no commentary, no text before or after the JSON.",
          },
          {
            role: "user",
            content: `Write TWO clearly different caption variants for the SAME post for A/B testing. Platform: ${platform}. Tone: ${tone}. Topic: "${topic}". The two variants MUST differ in hook, structure, or angle (not just word choice). Pick a different ARCHETYPE for each variant from this exact list: ${ALLOWED_STYLES.join(", ")}. Return JSON exactly in this shape: {"a":"variant A caption","b":"variant B caption","styleA":"<one of the archetypes>","styleB":"<one of the archetypes, different from styleA>"}. The styleA and styleB values must be copied verbatim from the list above with matching capitalization.`,
          },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const pair = parsePair(content);
    if (!pair) {
      return NextResponse.json({ error: "Could not parse A/B pair." }, { status: 502 });
    }
    let styleB = pair.styleB;
    if (styleB === pair.styleA) {
      const next = ALLOWED_STYLES.find((s) => s !== pair.styleA) ?? "Story-based";
      styleB = next;
    }
    return NextResponse.json({
      a: pair.a,
      b: pair.b,
      styleA: pair.styleA,
      styleB,
      tokens: tokenInfoPayload(spend),
    });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not generate A/B pair.") },
      { status: 500 }
    );
  }
}
