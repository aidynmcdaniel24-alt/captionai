import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/get-app-url";
import { getStripe } from "@/lib/stripe";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let interval: "month" | "year" = "month";
  try {
    const body = await req.json();
    if (body?.interval === "year" || body?.billing === "annual") {
      interval = "year";
    }
  } catch {
    /* no body */
  }

  const stripe = getStripe();
  const priceIdMonthly = process.env.STRIPE_PRICE_ID?.trim();
  const priceIdAnnual = process.env.STRIPE_PRICE_ID_ANNUAL?.trim();
  if (interval === "year" && !priceIdAnnual) {
    return NextResponse.json(
      {
        error:
          "Annual billing is not configured. Set STRIPE_PRICE_ID_ANNUAL in your environment for $79/yr checkout.",
      },
      { status: 500 }
    );
  }

  const priceId = interval === "year" ? priceIdAnnual! : priceIdMonthly;

  if (!stripe || !priceId) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID (and STRIPE_PRICE_ID_ANNUAL for $79/yr) to your environment.",
      },
      { status: 500 }
    );
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;

  const baseUrl = getAppUrl(req);

  const { data: subRow, error: subReadError } = await supabaseServer
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (subReadError) {
    return NextResponse.json({ error: subReadError.message }, { status: 500 });
  }

  const existingCustomerId = subRow?.stripe_customer_id?.trim();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel`,
      client_reference_id: userId,
      metadata: { clerk_user_id: userId, billing_interval: interval },
      subscription_data: {
        metadata: { clerk_user_id: userId, billing_interval: interval },
      },
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : email
          ? { customer_email: email }
          : {}),
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url, interval });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe checkout failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
