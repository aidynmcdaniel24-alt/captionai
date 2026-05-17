import { supabaseServer } from "@/lib/supabase/server";

/** Upsert Pro plan and optional Stripe customer id in one write. */
export async function upsertProSubscription(
  userId: string,
  stripeCustomerId: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const row: {
    user_id: string;
    plan: string;
    updated_at: string;
    stripe_customer_id?: string;
  } = {
    user_id: userId,
    plan: "pro",
    updated_at: new Date().toISOString(),
  };

  const cid = stripeCustomerId?.trim();
  if (cid) {
    row.stripe_customer_id = cid;
  }

  const { error } = await supabaseServer.from("subscriptions").upsert(row, { onConflict: "user_id" });

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/** Save Stripe customer id without changing plan (inserts free row if missing). */
export async function persistStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
  const cid = stripeCustomerId.trim();
  if (!cid) {
    return;
  }

  const { error } = await supabaseServer.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: cid,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.warn("[subscription-db] could not save stripe_customer_id:", error.message);
  }
}
