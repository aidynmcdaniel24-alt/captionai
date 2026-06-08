import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq-client";
import { extractJsonPayload } from "@/lib/groq-json";
import { withGroqRetry } from "@/lib/groq-retry";
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
import { getPlan, spendTokens, TOKEN_COSTS, tokenInfoPayload } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTranslated(raw: string): string | null {
  const payload = extractJsonPayload(raw);
  try {
    const j = JSON.parse(payload) as { translated?: string };
    const text = j.translated?.toString().trim();
    return text && text.length <= 4000 ? text : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const authResult = await requireUser(req, "tools:translate-caption");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "tools:translate-caption",
    RATE_LIMITS.captionGenerate
  );
  if (rateLimited) return rateLimited;

  const plan = await getPlan(userId);
  if (!isProPlan(plan)) {
    return NextResponse.json(
      { error: "Caption Translator is a Pro feature.", proRequired: true },
      { status: 402 }
    );
  }

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const caption = sanitizeText(body.caption, { maxLength: 4000, allowLineBreaks: true });
  const fromPlatform = sanitizeText(body.fromPlatform ?? "Instagram", { maxLength: 80 }) || "Instagram";
  const toPlatform = sanitizeText(body.toPlatform ?? "TikTok", { maxLength: 80 }) || "TikTok";

  if (!caption) {
    return NextResponse.json({ error: "Caption is required." }, { status: 400 });
  }

  const groq = getGroqClient();
  if (!groq) return NextResponse.json({ error: "AI unavailable." }, { status: 503 });

  const spend = await spendTokens(userId, TOKEN_COSTS.translate, "tools:translate-caption");
  if (!spend.ok) return spend.response;

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              'You adapt social media captions from one platform\'s voice to another so they sound native on the destination platform. Reply with strict JSON only: {"translated":"..."}.',
          },
          {
            role: "user",
            content: `FROM platform: ${fromPlatform}\nTO platform: ${toPlatform}\n\nRewrite this caption so it sounds native on ${toPlatform} — match length, hook style, hashtag rules, and tone conventions. Example: an Instagram lifestyle caption becomes a punchy TikTok caption.\n\nOriginal:\n"""${caption}"""\n\nReturn JSON with key "translated" only.`,
          },
        ],
      })
    );

    const translated = parseTranslated(completion.choices[0]?.message?.content ?? "");
    if (!translated) {
      return NextResponse.json({ error: "Could not translate the caption." }, { status: 502 });
    }

    return NextResponse.json({
      original: caption,
      translated,
      fromPlatform,
      toPlatform,
      tokens: tokenInfoPayload(spend),
    });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not translate the caption.") },
      { status: 500 }
    );
  }
}
