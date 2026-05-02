import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function customerIdFromSession(session: Stripe.Checkout.Session) {
  const c = session.customer;
  if (typeof c === "string") {
    return c;
  }
  return c?.id ?? null;
}

async function setPlanPro(userId: string, stripeCustomerId: string | null) {
  const { error } = await supabaseServer.from("subscriptions").upsert(
    {
      user_id: userId,
      plan: "pro",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[stripe webhook] subscriptions upsert:", error.message);
    return NextResponse.json({ error: "Could not update subscription in database." }, { status: 500 });
  }

  if (stripeCustomerId) {
    const { error: cidErr } = await supabaseServer
      .from("subscriptions")
      .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (cidErr) {
      console.warn(
        "[stripe webhook] stripe_customer_id update skipped (run supabase/step5_stripe_portal.sql?):",
        cidErr.message
      );
    }
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
    const userId = session.client_reference_id ?? session.metadata?.clerk_user_id;

    const paid =
      session.payment_status === "paid" || session.payment_status === "no_payment_required";

    if (userId && session.mode === "subscription" && paid) {
      const cid = customerIdFromSession(session);
      const errRes = await setPlanPro(userId, cid);
      if (errRes) {
        return errRes;
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    let userId = sub.metadata?.clerk_user_id;

    if (!userId) {
      const cid =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
      if (cid) {
        const { data: row } = await supabaseServer
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", cid)
          .maybeSingle();
        userId = row?.user_id ?? undefined;
      }
    }

    if (userId) {
      const errRes = await setPlanFree(userId);
      if (errRes) {
        return errRes;
      }
    }
  }

  return NextResponse.json({ received: true });
}
