import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSubscriptionBillingInfo } from "@/lib/billing-details";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authResult = await requireUser(req, "billing:cancel");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "billing:cancel", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment." },
      { status: 500 }
    );
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;

  try {
    const info = await getSubscriptionBillingInfo(stripe, userId, email);

    if (!info.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found. If you recently upgraded, try again in a minute." },
        { status: 400 }
      );
    }

    if (info.cancelAtPeriodEnd) {
      return NextResponse.json({
        ok: true,
        message: "Your subscription is already set to cancel at the end of the billing period.",
        cancelAtPeriodEnd: true,
        nextBillingDate: info.nextBillingDate,
      });
    }

    await stripe.subscriptions.update(info.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({
      ok: true,
      message:
        "Subscription canceled. You keep Pro access until the end of your current billing period.",
      cancelAtPeriodEnd: true,
      nextBillingDate: info.nextBillingDate,
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not cancel subscription.") },
      { status: 500 }
    );
  }
}
