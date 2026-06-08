import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq-client";
import { extractJsonPayload } from "@/lib/groq-json";
import { withGroqRetry } from "@/lib/groq-retry";
import { getPlan } from "@/lib/tokens";
import { isProPlan } from "@/lib/plan";
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

const CAPTION_MAX = 4000;

type LengthTarget = { label: string; guidance: string };

function targetForPlatform(platform: string): LengthTarget {
  const p = platform.trim().toLowerCase();
  if (p.includes("tiktok")) {
    return { label: "under 150 characters", guidance: "Keep the whole caption body under 150 characters — punchy, 1-3 short lines." };
  }
  if (p.includes("insta")) {
    return { label: "138–150 characters", guidance: "Aim for 138–150 characters of body copy (before the hashtag block) — the Instagram sweet spot." };
  }
  if (p.includes("linkedin")) {
    return { label: "1,200–1,600 characters", guidance: "Expand to 1,200–1,600 characters across 3-5 short paragraphs separated by blank lines — substantial but skimmable." };
  }
  if (p.includes("twitter") || p === "x") {
    return { label: "under 280 characters", guidance: "Keep the entire post under 280 characters including any hashtags." };
  }
  if (p.includes("facebook")) {
    return { label: "around 80–120 characters", guidance: "Keep it short and conversational, roughly 80–120 characters." };
  }
  if (p.includes("youtube")) {
    return { label: "150–300 characters", guidance: "Front-load keywords in the first 150 characters; total 150–300 is ideal for the preview." };
  }
  return { label: "the platform's ideal length", guidance: "Match the typical ideal length for this platform — concise but complete." };
}

function parseOptimized(raw: string): string | null {
  const payload = extractJsonPayload(raw);
  try {
    const j = JSON.parse(payload) as { caption?: string };
    const text = j.caption?.toString().trim();
    if (!text || text.length > CAPTION_MAX) return null;
    return text;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const authResult = await requireUser(req, "tools:optimize-length");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "tools:optimize-length",
    RATE_LIMITS.captionGenerate
  );
  if (rateLimited) return rateLimited;

  const plan = await getPlan(userId);
  if (!isProPlan(plan)) {
    return NextResponse.json(
      { error: "Length optimizer is a Pro feature.", proRequired: true },
      { status: 402 }
    );
  }

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const caption = sanitizeText(body.caption, { maxLength: CAPTION_MAX, allowLineBreaks: true });
  const platform = sanitizeText(body.platform ?? "Instagram", { maxLength: 80 }) || "Instagram";

  if (!caption) {
    return NextResponse.json({ error: "Caption is required." }, { status: 400 });
  }

  const target = targetForPlatform(platform);

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json({ error: "AI unavailable." }, { status: 503 });
  }

  const spend = await spendTokens(userId, TOKEN_COSTS.optimizeLength, "tools:optimize-length");
  if (!spend.ok) return spend.response;

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.6,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              'You rewrite social media captions to the platform\'s ideal length while preserving the hook, voice, meaning, and any hashtags. Reply with strict JSON only: {"caption":"..."}. Do not add commentary.',
          },
          {
            role: "user",
            content: `Platform: ${platform}\nIdeal length: ${target.label}.\n${target.guidance}\n\nRewrite this caption to hit that ideal length without losing its hook or message. Keep it ready to paste:\n"""${caption}"""\n\nReturn JSON with key "caption" only.`,
          },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const optimized = parseOptimized(content);
    if (!optimized) {
      return NextResponse.json({ error: "Could not optimize the caption." }, { status: 502 });
    }

    return NextResponse.json({
      optimized,
      originalLength: caption.length,
      optimizedLength: optimized.length,
      target: target.label,
      tokens: tokenInfoPayload(spend),
    });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not optimize the caption.") },
      { status: 500 }
    );
  }
}
