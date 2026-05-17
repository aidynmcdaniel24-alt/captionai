import { MIN_PAYOUT_CENTS } from "@/lib/affiliate-currency";
import { supabaseServer } from "@/lib/supabase/server";

export type PayoutSummary = {
  minPayoutCents: number;
  earningsCents: number;
  reservedCents: number;
  availableCents: number;
  eligible: boolean;
  hasPendingPayout: boolean;
};

export async function getAffiliatePayoutSummary(affiliateUserId: string, earningsCents: number): Promise<PayoutSummary> {
  const { data: requests, error } = await supabaseServer
    .from("affiliate_payout_requests")
    .select("amount_cents, status")
    .eq("affiliate_user_id", affiliateUserId)
    .in("status", ["pending", "paid"]);

  if (error) {
    console.warn("[affiliate-payout] could not read payout requests:", error.message);
  }

  const rows = requests ?? [];
  const reservedCents = rows.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
  const hasPendingPayout = rows.some((row) => row.status === "pending");
  const availableCents = Math.max(0, earningsCents - reservedCents);

  return {
    minPayoutCents: MIN_PAYOUT_CENTS,
    earningsCents,
    reservedCents,
    availableCents,
    eligible: availableCents >= MIN_PAYOUT_CENTS && !hasPendingPayout,
    hasPendingPayout,
  };
}

export function isValidPaypalEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function isValidVenmoUsername(value: string): boolean {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(value);
}
