/**
 * Cancels Stripe subscription(s) tied to a Clerk user via subscription metadata.
 *
 * Usage:
 *   node scripts/cancel-stripe-subscription.mjs              # single user_id row in Supabase
 *   node scripts/cancel-stripe-subscription.mjs user_xxxxx   # explicit Clerk user id
 */
import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const path = join(__dirname, "..", ".env.local");
  const raw = fs.readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function getSupabaseKey(env) {
  const raw =
    env.SUPABASE_SERVICE_ROLE_KEY ??
    env.SUPABASE_SECRET_KEY ??
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return raw?.replace(/[\s"]/g, "") ?? "";
}

const explicitUserId = process.argv[2]?.trim();
const env = loadEnvLocal();
const stripeKey = env.STRIPE_SECRET_KEY?.trim();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const skey = getSupabaseKey(env);

if (!stripeKey) {
  console.error("Missing STRIPE_SECRET_KEY in .env.local");
  process.exit(1);
}

const stripe = new Stripe(stripeKey);

let userId = explicitUserId;

if (!userId) {
  if (!url || !skey) {
    console.error("Need clerk_user_id argument or Supabase credentials to look up user_id.");
    process.exit(1);
  }
  const supabase = createClient(url, skey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: rows, error } = await supabase.from("subscriptions").select("user_id");
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  if (!rows?.length) {
    console.log("No subscriptions rows in Supabase.");
    process.exit(0);
  }
  if (rows.length > 1) {
    console.error("Multiple users in DB. Pass Clerk user id:\n");
    rows.forEach((r) => console.log(`  ${r.user_id}`));
    process.exit(1);
  }
  userId = rows[0].user_id;
}

try {
  const search = await stripe.subscriptions.search({
    query: `metadata['clerk_user_id']:'${userId}'`,
    limit: 20,
  });

  const cancellable = search.data.filter((s) =>
    ["active", "trialing", "past_due"].includes(s.status)
  );

  if (cancellable.length === 0) {
    console.log(
      "No active Stripe subscriptions found for metadata clerk_user_id. If checkout used an older flow without metadata, cancel manually in Stripe Dashboard → Customers."
    );
    process.exit(0);
  }

  for (const sub of cancellable) {
    await stripe.subscriptions.cancel(sub.id);
    console.log(`Canceled Stripe subscription ${sub.id} (status was ${sub.status}).`);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
