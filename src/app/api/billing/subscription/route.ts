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

export async function GET(req: Request) {
  const authResult = await requireUser(req, "billing:subscription");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "billing:subscription", RATE_LIMITS.generalApi);
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
    return NextResponse.json(info);
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not load subscription.") },
      { status: 500 }
    );
  }
}
