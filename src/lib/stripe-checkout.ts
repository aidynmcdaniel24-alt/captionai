import type Stripe from "stripe";

export function stripeCustomerIdFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  const c = session.customer;
  if (typeof c === "string") {
    return c;
  }
  return c?.id ?? null;
}

export function clerkUserIdFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  return session.client_reference_id ?? session.metadata?.clerk_user_id ?? null;
}

export function checkoutSessionIsPaidSubscription(session: Stripe.Checkout.Session): boolean {
  if (session.mode !== "subscription") {
    return false;
  }
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}
