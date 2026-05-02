/**
 * Sets subscriptions.plan for your Clerk user (single-row DB) or a given user id.
 *
 * Usage:
 *   node scripts/set-subscription-plan.mjs free
 *   node scripts/set-subscription-plan.mjs pro
 *   node scripts/set-subscription-plan.mjs pro user_xxxxx
 */
import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
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

const planArg = process.argv[2]?.trim().toLowerCase();
const explicitUserId = process.argv[3]?.trim();

if (planArg !== "free" && planArg !== "pro") {
  console.error('Usage: node scripts/set-subscription-plan.mjs <free|pro> [clerk_user_id]');
  process.exit(1);
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = getSupabaseKey(env);

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: rows, error: selErr } = await supabase
  .from("subscriptions")
  .select("user_id, plan");

if (selErr) {
  console.error("Could not read subscriptions:", selErr.message);
  process.exit(1);
}

let userId = explicitUserId;

if (!userId) {
  if (!rows?.length) {
    console.log("No rows in subscriptions. Nothing to update.");
    process.exit(0);
  }
  if (rows.length > 1) {
    console.log("Multiple users found. Pass your Clerk user id:\n");
    rows.forEach((r) => console.log(`  ${r.user_id}  (plan: ${r.plan})`));
    console.log("\nExample: node scripts/set-subscription-plan.mjs pro user_xxxxxxxx");
    process.exit(1);
  }
  userId = rows[0].user_id;
}

const { error: updErr } = await supabase
  .from("subscriptions")
  .update({ plan: planArg, updated_at: new Date().toISOString() })
  .eq("user_id", userId);

if (updErr) {
  console.error("Update failed:", updErr.message);
  process.exit(1);
}

console.log(`Updated subscriptions: user_id=${userId} → plan=${planArg}`);
