import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSubscriptionBillingInfo } from "@/lib/billing-details";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const message = error instanceof Error ? error.message : "Could not load subscription.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
