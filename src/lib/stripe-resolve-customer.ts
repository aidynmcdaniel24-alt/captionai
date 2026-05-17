import type Stripe from "stripe";
import { persistStripeCustomerId } from "@/lib/subscription-db";

function customerIdFromStripe(ref: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!ref) return null;
  if (typeof ref === "string") return ref;
  if ("deleted" in ref && ref.deleted) return null;
  return ref.id;
}

async function storedCustomerIsValid(stripe: Stripe, customerId: string): Promise<boolean> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return !("deleted" in customer && customer.deleted);
  } catch {
    return false;
  }
}

async function pickCustomerWhenDuplicates(stripe: Stripe, customers: Stripe.Customer[]): Promise<string | null> {
  if (customers.length === 0) return null;
  if (customers.length === 1) return customers[0].id;

  const priority = ["active", "trialing", "past_due"] as const;
  for (const status of priority) {
    for (const c of customers) {
      const subs = await stripe.subscriptions.list({
        customer: c.id,
        status,
        limit: 1,
      });
      if (subs.data.length > 0) {
        return c.id;
      }
    }
  }

  for (const c of customers) {
    const subs = await stripe.subscriptions.list({ customer: c.id, limit: 5 });
    if (subs.data.length > 0) {
      return c.id;
    }
  }

  return customers[0].id;
}

/**
 * Finds Stripe Customer ID for a Clerk user using subscription metadata, then email fallbacks.
 */
export async function resolveStripeCustomerId(
  stripe: Stripe,
  userId: string,
  email: string | undefined,
  existingFromDb: string | null | undefined
): Promise<string | null> {
  const trimmed = existingFromDb?.trim();
  if (trimmed && (await storedCustomerIsValid(stripe, trimmed))) {
    return trimmed;
  }

  try {
    const search = await stripe.subscriptions.search({
      query: `metadata['clerk_user_id']:'${userId}'`,
      limit: 10,
    });

    for (const sub of search.data) {
      const cid = customerIdFromStripe(sub.customer);
      if (cid) {
        await persistStripeCustomerId(userId, cid);
        return cid;
      }
    }
  } catch (err) {
    console.warn(
      "[stripe-resolve-customer] subscription search unavailable or failed:",
      err instanceof Error ? err.message : err
    );
  }

  if (!email) {
    return null;
  }

  const list = await stripe.customers.list({ email, limit: 25 });
  if (list.data.length === 0) {
    return null;
  }

  const cid = await pickCustomerWhenDuplicates(stripe, list.data);
  if (cid) {
    await persistStripeCustomerId(userId, cid);
  }
  return cid;
}
