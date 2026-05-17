import type Stripe from "stripe";
import { resolveStripeCustomerId } from "@/lib/stripe-resolve-customer";
import { supabaseServer } from "@/lib/supabase/server";

export type BillingInterval = "month" | "year" | null;

export type SubscriptionBillingInfo = {
  plan: "free" | "pro";
  interval: BillingInterval;
  priceLabel: string | null;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
};

function intervalFromSubscription(sub: Stripe.Subscription): BillingInterval {
  const item = sub.items.data[0];
  const recurring = item?.price?.recurring;
  if (recurring?.interval === "year") {
    return "year";
  }
  if (recurring?.interval === "month") {
    return "month";
  }
  const meta = sub.metadata?.billing_interval;
  if (meta === "year") {
    return "year";
  }
  if (meta === "month") {
    return "month";
  }
  return null;
}

function priceLabelForInterval(interval: BillingInterval): string | null {
  if (interval === "year") {
    return "$79/year";
  }
  if (interval === "month") {
    return "$9/month";
  }
  return null;
}

function pickActiveSubscription(subs: Stripe.Subscription[]): Stripe.Subscription | null {
  const priority = ["active", "trialing", "past_due"] as const;
  for (const status of priority) {
    const match = subs.find((s) => s.status === status);
    if (match) {
      return match;
    }
  }
  return subs[0] ?? null;
}

export async function getSubscriptionBillingInfo(
  stripe: Stripe,
  userId: string,
  email: string | undefined
): Promise<SubscriptionBillingInfo> {
  const { data: row, error } = await supabaseServer
    .from("subscriptions")
    .select("plan, stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const plan = row?.plan === "pro" ? "pro" : "free";

  const customerId = await resolveStripeCustomerId(
    stripe,
    userId,
    email,
    row?.stripe_customer_id ?? null
  );

  if (!customerId) {
    return {
      plan,
      interval: null,
      priceLabel: null,
      nextBillingDate: null,
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
    };
  }

  const list = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  const sub = pickActiveSubscription(
    list.data.filter((s) => s.status !== "canceled" && s.status !== "incomplete_expired")
  );

  if (!sub || sub.status === "canceled") {
    return {
      plan,
      interval: null,
      priceLabel: null,
      nextBillingDate: null,
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
    };
  }

  const interval = intervalFromSubscription(sub);
  const periodEndUnix =
    sub.items.data[0]?.current_period_end ??
    (sub as { current_period_end?: number }).current_period_end ??
    null;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;

  return {
    plan: plan === "pro" || ["active", "trialing", "past_due"].includes(sub.status) ? "pro" : plan,
    interval,
    priceLabel: priceLabelForInterval(interval),
    nextBillingDate: periodEnd,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    stripeSubscriptionId: sub.id,
  };
}
