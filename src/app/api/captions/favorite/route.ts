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

type FavoriteBody = {
  historyId?: unknown;
  captionIndex?: unknown;
};

async function parseFavoriteBody(req: Request) {
  const result = await readJsonWithLimit<FavoriteBody>(req, REQUEST_SIZE_LIMITS.default);
  if (!result.ok) return result;
  const historyId = sanitizeText(result.data.historyId, { maxLength: 64 });
  const captionIndex = Number(result.data.captionIndex);
  if (
    !historyId ||
    !Number.isInteger(captionIndex) ||
    captionIndex < 0 ||
    captionIndex > 99
  ) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Invalid payload." }, { status: 400 }),
    };
  }
  return { ok: true as const, historyId, captionIndex };
}

export async function POST(req: Request) {
  const authResult = await requireUser(req, "captions:favorite");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "captions:favorite", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const parsed = await parseFavoriteBody(req);
  if (!parsed.ok) return parsed.response;
  const { historyId, captionIndex } = parsed;

  const { data: row } = await supabaseServer
    .from("caption_history")
    .select("id")
    .eq("id", historyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { error } = await supabaseServer.from("caption_favorites").insert({
    user_id: userId,
    history_id: historyId,
    caption_index: captionIndex,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not favorite.") },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const authResult = await requireUser(req, "captions:favorite:delete");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "captions:favorite:delete", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const parsed = await parseFavoriteBody(req);
  if (!parsed.ok) return parsed.response;
  const { historyId, captionIndex } = parsed;

  const { error } = await supabaseServer
    .from("caption_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("history_id", historyId)
    .eq("caption_index", captionIndex);

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not remove favorite.") },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
