import { NextResponse } from "next/server";
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
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Caption Memory (Feature 9): records every caption a user copies so we can
 * personalize analytics and best-time suggestions. Fire-and-forget from the
 * client — failures are logged but never block the copy action.
 */
export async function POST(req: Request) {
  const authResult = await requireUser(req, "captions:copy");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "captions:copy", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const captionText = sanitizeText(body.captionText ?? body.caption, {
    maxLength: 4000,
    allowLineBreaks: true,
  });
  const platform = sanitizeText(body.platform, { maxLength: 80 }) || null;
  const tone = sanitizeText(body.tone, { maxLength: 80 }) || null;
  const topic = sanitizeText(body.topic, { maxLength: 500, allowLineBreaks: true }) || null;
  const score =
    typeof body.score === "number" && Number.isFinite(body.score)
      ? Math.round(body.score)
      : null;

  if (!captionText) {
    return NextResponse.json({ error: "captionText is required." }, { status: 400 });
  }

  try {
    const { error } = await supabaseServer.from("caption_copies").insert({
      user_id: userId,
      caption_text: captionText,
      platform,
      tone,
      topic,
      score,
      copied_at: new Date().toISOString(),
    });

    if (error) {
      // Table may not exist yet — log and still return ok so copy UX is never blocked.
      console.warn("[caption_copies] insert failed:", error.message);
      return NextResponse.json({ ok: true, stored: false });
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch (e) {
    console.warn("[caption_copies] insert threw:", safeErrorMessage(e, "unknown"));
    return NextResponse.json({ ok: true, stored: false });
  }
}
