/** 20% of monthly ($9) and annual ($79) — Stripe amounts are in cents. */
export const AFFILIATE_RATE = 0.2;

export function commissionCentsFromPayment(amountTotalCents: number): number {
  if (!Number.isFinite(amountTotalCents) || amountTotalCents <= 0) {
    return 0;
  }
  return Math.round(amountTotalCents * AFFILIATE_RATE);
}
