import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { ADMIN_EVENTS, logAdminEvent } from "@/lib/admin-log";
import { sendWelcomeEmail } from "@/lib/emails";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Ensure the user has a `subscriptions` row, and send the welcome email exactly
 * once. Called from the dashboard server component so it triggers on the user's
 * first authenticated dashboard visit — no Clerk webhook required.
 *
 * Requires the `welcome_email_sent_at timestamptz` column on the `subscriptions`
 * table (see supabase/welcome_emails.sql in the welcome-emails SQL block).
 */
export async function ensureWelcomeEmail(userId: string): Promise<void> {
  try {
    const { data: existing, error: readErr } = await supabaseServer
      .from("subscriptions")
      .select("plan, welcome_email_sent_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (readErr) {
      console.warn("[welcome-email] subscriptions read failed:", readErr.message);
      return;
    }

    if (existing?.welcome_email_sent_at) {
      return;
    }

    if (!existing) {
      const { error: insertErr } = await supabaseServer.from("subscriptions").insert({
        user_id: userId,
        plan: "free",
        updated_at: new Date().toISOString(),
      });
      if (insertErr) {
        console.warn("[welcome-email] subscriptions insert failed:", insertErr.message);
        return;
      }
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryId = user.primaryEmailAddressId;
    const primaryEmail =
      user.emailAddresses.find((e) => e.id === primaryId)?.emailAddress ??
      user.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      return;
    }

    const firstName = user.firstName?.trim() || undefined;
    const result = await sendWelcomeEmail(primaryEmail, firstName);
    if (!result.ok) {
      // Don't mark it sent if SMTP wasn't configured/failed — we'll retry next visit.
      return;
    }

    await logAdminEvent("info", ADMIN_EVENTS.WELCOME_EMAIL_SENT, {
      user_id: userId,
    });

    const { error: markErr } = await supabaseServer
      .from("subscriptions")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (markErr) {
      // If the column is missing, fall back to a no-op so dashboards still work.
      console.warn("[welcome-email] mark sent failed (run welcome_emails.sql?):", markErr.message);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.warn("[welcome-email] unexpected:", msg);
  }
}
