import { NextResponse } from "next/server";
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
import {
  checkoutSessionIsPaidSubscription,
  clerkUserIdFromCheckoutSession,
  stripeCustomerIdFromCheckoutSession,
} from "@/lib/stripe-checkout";
import { getStripe } from "@/lib/stripe";
import { upsertProSubscription } from "@/lib/subscription-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SyncBody = {
  sessionId?: unknown;
  session_id?: unknown;
};

/** Confirms checkout after redirect (backup when webhooks are delayed or misconfigured). */
export async function POST(req: Request) {
  const authResult = await requireUser(req, "billing:sync-checkout");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "billing:sync-checkout", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<SyncBody>(req, REQUEST_SIZE_LIMITS.default);
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const sessionId = sanitizeText(body.sessionId ?? body.session_id, { maxLength: 200 });

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
      return NextResponse.json(
        { error: safeErrorMessage(new Error(result.message), "Could not save subscription.") },
        { status: 500 }
      );
    }

    return NextResponse.json({ plan: "pro", stripeCustomerId: customerId });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not verify checkout.") },
      { status: 500 }
    );
  }
}
