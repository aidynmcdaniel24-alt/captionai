import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { resolveIsClerkAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type PayoutRequestRow = {
  id: string;
  affiliate_user_id: string;
  amount_cents: number;
  payment_method: string;
  payment_handle: string;
  preferred_currency: string;
  status: string;
  created_at: string;
};

export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await resolveIsClerkAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = 50;

  const { data: items, error } = await supabaseServer
    .from("affiliate_payout_requests")
    .select(
      "id, affiliate_user_id, amount_cents, payment_method, payment_handle, preferred_currency, status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (items ?? []) as PayoutRequestRow[];

  const { data: pendingRows, error: pendingErr } = await supabaseServer
    .from("affiliate_payout_requests")
    .select("amount_cents")
    .eq("status", "pending");

  const { data: paidRows, error: paidErr } = await supabaseServer
    .from("affiliate_payout_requests")
    .select("amount_cents")
    .eq("status", "paid");

  const totalPendingCents = pendingErr
    ? 0
    : (pendingRows ?? []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
  const totalPaidCents = paidErr
    ? 0
    : (paidRows ?? []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);

  return NextResponse.json({
    items: rows,
    totalPendingCents,
    totalPaidCents,
    warnings: [
      ...(pendingErr ? [`Pending total unavailable: ${pendingErr.message}`] : []),
      ...(paidErr ? [`Paid total unavailable: ${paidErr.message}`] : []),
    ],
  });
}
