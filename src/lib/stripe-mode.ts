/** True when the server Stripe secret key is a test key (sk_test_…). */
export function isStripeTestSecretKey(secretKey: string | undefined): boolean {
  const key = secretKey?.trim() ?? "";
  return key.startsWith("sk_test_");
}

/** Affiliate commission must never be credited for Stripe test / non-live events. */
export function shouldCreditAffiliateCommission(livemode: boolean, secretKey?: string): boolean {
  if (!livemode) {
    return false;
  }
  if (isStripeTestSecretKey(secretKey ?? process.env.STRIPE_SECRET_KEY)) {
    return false;
  }
  return true;
}
