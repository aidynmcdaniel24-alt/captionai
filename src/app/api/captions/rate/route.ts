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

const RATINGS = new Set(["worst", "medium", "best"]);

export async function POST(req: Request) {
  const authResult = await requireUser(req, "captions:rate");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "captions:rate", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.default
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const historyId = sanitizeText(body.historyId, { maxLength: 64 });
  const rawIndex = body.captionIndex;
  if (rawIndex === null || rawIndex === undefined || rawIndex === "") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const captionIndex = Number(rawIndex);
  const rating = sanitizeText(body.rating, { maxLength: 16 }).toLowerCase();

  if (
    !historyId ||
    Number.isNaN(captionIndex) ||
    !Number.isInteger(captionIndex) ||
    captionIndex < 0 ||
    captionIndex > 99 ||
    !RATINGS.has(rating)
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { data: row } = await supabaseServer
    .from("caption_history")
    .select("id")
    .eq("id", historyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { error } = await supabaseServer.from("caption_ratings").upsert(
    {
      user_id: userId,
      history_id: historyId,
      caption_index: captionIndex,
      rating,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,history_id,caption_index" }
  );

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not save rating.") },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
