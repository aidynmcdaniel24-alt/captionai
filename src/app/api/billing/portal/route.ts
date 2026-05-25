import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/get-app-url";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import { resolveStripeCustomerId } from "@/lib/stripe-resolve-customer";
import { getStripe } from "@/lib/stripe";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authResult = await requireUser(req, "billing:portal");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "billing:portal", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

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
    return NextResponse.json(
      { error: safeErrorMessage(readError, "Could not look up billing customer.") },
      { status: 500 }
    );
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
    const raw = error instanceof Error ? error.message : "";
    if (raw.toLowerCase().includes("customer portal is not enabled")) {
      return NextResponse.json(
        {
          error:
            "Enable the Customer portal in Stripe: Dashboard → Settings → Billing → Customer portal.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not open billing portal.") },
      { status: 500 }
    );
  }
}
