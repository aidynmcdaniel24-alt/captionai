import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/get-app-url";
import { resolveStripeCustomerId } from "@/lib/stripe-resolve-customer";
import { getStripe } from "@/lib/stripe";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY. Add it to your environment." },
      { status: 500 }
    );
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;

  const { data: row, error: readError } = await supabaseServer
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const customerId = await resolveStripeCustomerId(
    stripe,
    userId,
    email,
    row?.stripe_customer_id ?? null
  );

  if (!customerId) {
    return NextResponse.json(
      {
        error:
          "No Stripe customer found for your account. Complete Pro checkout once from this app while signed in (Settings → upgrade), or make sure your Clerk email matches the email used in Stripe.",
      },
      { status: 400 }
    );
  }

  const baseUrl = getAppUrl(req);
  const returnUrl = `${baseUrl}/profile`;

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    if (!portal.url) {
      return NextResponse.json({ error: "Stripe did not return a portal URL." }, { status: 500 });
    }
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open billing portal.";
    if (message.toLowerCase().includes("customer portal is not enabled")) {
      return NextResponse.json(
        {
          error:
            "Enable the Customer portal in Stripe: Dashboard → Settings → Billing → Customer portal.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
