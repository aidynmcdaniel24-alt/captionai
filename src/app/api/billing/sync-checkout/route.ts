import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  checkoutSessionIsPaidSubscription,
  clerkUserIdFromCheckoutSession,
  stripeCustomerIdFromCheckoutSession,
} from "@/lib/stripe-checkout";
import { getStripe } from "@/lib/stripe";
import { upsertProSubscription } from "@/lib/subscription-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Confirms checkout after redirect (backup when webhooks are delayed or misconfigured). */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let sessionId = "";
  try {
    const body = await req.json();
    sessionId = (body.sessionId ?? body.session_id ?? "").toString().trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const ownerId = clerkUserIdFromCheckoutSession(session);

    if (ownerId !== userId) {
      return NextResponse.json({ error: "Checkout session does not belong to this account." }, { status: 403 });
    }

    if (!checkoutSessionIsPaidSubscription(session)) {
      return NextResponse.json({ error: "Checkout is not complete yet." }, { status: 400 });
    }

    const customerId = stripeCustomerIdFromCheckoutSession(session);
    const result = await upsertProSubscription(userId, customerId);

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({ plan: "pro", stripeCustomerId: customerId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
