import { NextResponse } from "next/server";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import { sanitizeText } from "@/lib/security/sanitize";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

export async function DELETE(req: Request, ctx: RouteContext) {
  const authResult = await requireUser(req, "collections:remove-item");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "collections:remove-item",
    RATE_LIMITS.generalApi
  );
  if (rateLimited) return rateLimited;

  const { id, itemId } = await ctx.params;
  const collectionId = sanitizeText(id, { maxLength: 64 });
  const itemIdSafe = sanitizeText(itemId, { maxLength: 64 });

  const { error } = await supabaseServer
    .from("caption_collection_items")
    .delete()
    .eq("id", itemIdSafe)
    .eq("collection_id", collectionId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not remove item.") },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
