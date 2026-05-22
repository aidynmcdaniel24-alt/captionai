import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { commissionCentsFromPayment } from "@/lib/affiliate-commission";
import { shouldCreditAffiliateCommission } from "@/lib/stripe-mode";
import {
  checkoutSessionIsPaidSubscription,
  clerkUserIdFromCheckoutSession,
  stripeCustomerIdFromCheckoutSession,
} from "@/lib/stripe-checkout";
import { getStripe } from "@/lib/stripe";
import { upsertProSubscription } from "@/lib/subscription-db";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function setPlanPro(userId: string, stripeCustomerId: string | null) {
  const result = await upsertProSubscription(userId, stripeCustomerId);
  if (!result.ok) {
    console.error("[stripe webhook] subscriptions upsert:", result.message);
    if (result.message.toLowerCase().includes("stripe_customer_id")) {
      console.warn("[stripe webhook] run supabase/step5_stripe_portal.sql to add stripe_customer_id column");
    }
    return NextResponse.json({ error: "Could not update subscription in database." }, { status: 500 });
  }
  return null;
}

async function setPlanFree(userId: string) {
  const { error } = await supabaseServer
    .from("subscriptions")
    .update({
      plan: "free",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("[stripe webhook] set free:", error.message);
    return NextResponse.json({ error: "Could not update subscription in database." }, { status: 500 });
  }
  return null;
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY." },
      { status: 500 }
    );
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe-Signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: `Webhook signature: ${msg}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = clerkUserIdFromCheckoutSession(session);

    if (userId && checkoutSessionIsPaidSubscription(session)) {
      const cid = stripeCustomerIdFromCheckoutSession(session);
      const errRes = await setPlanPro(userId, cid);
      if (errRes) {
        return errRes;
      }

      const amountTotal = session.amount_total ?? 0;
      const commission = commissionCentsFromPayment(amountTotal);
      const creditCommission = shouldCreditAffiliateCommission(event.livemode);

      if (commission > 0 && creditCommission) {
        const { error: convErr } = await supabaseServer.rpc("record_affiliate_first_conversion", {
          p_lead_user_id: userId,
          p_commission_cents: commission,
          p_is_test: false,
        });
        if (convErr) {
          console.warn("[stripe webhook] affiliate commission:", convErr.message);
        }
      } else if (commission > 0 && !creditCommission) {
        console.info("[stripe webhook] affiliate commission skipped (Stripe test / non-live)", {
          livemode: event.livemode,
          userId,
          commissionCents: commission,
        });
      }
    }
  }

  async function resolveUserIdFromSubscription(sub: Stripe.Subscription): Promise<string | undefined> {
    if (sub.metadata?.clerk_user_id) {
      return sub.metadata.clerk_user_id;
    }
    const cid =
      typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
    if (!cid) {
      return undefined;
    }
    const { data: row } = await supabaseServer
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", cid)
      .maybeSingle();
    return row?.user_id ?? undefined;
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = await resolveUserIdFromSubscription(sub);
    if (userId) {
      const errRes = await setPlanFree(userId);
      if (errRes) {
        return errRes;
      }
    }
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = await resolveUserIdFromSubscription(sub);
    if (userId) {
      const cid = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
      const isActive = sub.status === "active" || sub.status === "trialing";
      const isCanceledOrUnpaid =
        sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired";

      if (isActive && !sub.cancel_at_period_end) {
        const errRes = await setPlanPro(userId, cid);
        if (errRes) {
          return errRes;
        }
      } else if (isCanceledOrUnpaid) {
        const errRes = await setPlanFree(userId);
        if (errRes) {
          return errRes;
        }
      }
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };
    const subRef = invoice.subscription;
    const subId = typeof subRef === "string" ? subRef : subRef?.id ?? null;
    if (subId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = await resolveUserIdFromSubscription(sub);
        if (userId && (sub.status === "active" || sub.status === "trialing")) {
          const cid = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
          const errRes = await setPlanPro(userId, cid);
          if (errRes) {
            return errRes;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        console.warn("[stripe webhook] invoice.paid retrieve:", msg);
      }
    }
  }

  return NextResponse.json({ received: true });
}
