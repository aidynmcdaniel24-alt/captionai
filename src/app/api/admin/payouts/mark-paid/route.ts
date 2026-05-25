import { NextResponse } from "next/server";
import { resolveIsClerkAdmin } from "@/lib/admin";
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

export async function POST(req: Request) {
  const authResult = await requireUser(req, "admin:payouts:mark-paid");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  if (!(await resolveIsClerkAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimited = rateLimitByUser(userId, "admin:payouts:mark-paid", RATE_LIMITS.adminApi);
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<{ id?: unknown }>(req, REQUEST_SIZE_LIMITS.default);
  if (!bodyResult.ok) return bodyResult.response;

  const id = sanitizeText(bodyResult.data.id, { maxLength: 64 });
  if (!id) {
    return NextResponse.json({ error: "Missing payout request id." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("affiliate_payout_requests")
    .update({ status: "paid" })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not mark payout paid.") },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Payout request not found or already marked paid." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, id: data.id, status: data.status });
}
