import "server-only";

import { supabaseServer } from "@/lib/supabase/server";

/**
 * Canonical event names written to `admin_logs.message`. Keeping these
 * centralised lets the admin panel filter / group reliably and makes it
 * easy to grep for every place that emits a given event.
 */
export const ADMIN_EVENTS = {
  // testimonial lifecycle
  TESTIMONIAL_SUBMITTED: "testimonial_submitted",
  TESTIMONIAL_APPROVED: "testimonial_approved",
  TESTIMONIAL_REJECTED_AI: "testimonial_rejected_ai",
  TESTIMONIAL_DELETED: "testimonial_deleted",
  TESTIMONIAL_HELPFUL: "testimonial_helpful",
  // security
  DISPOSABLE_EMAIL_BLOCKED: "disposable_email_blocked",
  RATE_LIMIT_HIT: "rate_limit_hit",
  AUTH_FAILURE: "auth_failure",
  REQUEST_TOO_LARGE: "request_too_large",
  // content moderation
  CONTENT_MODERATED: "content_moderated",
  // user lifecycle emails
  WELCOME_EMAIL_SENT: "welcome_email_sent",
  PRO_EMAIL_SENT: "pro_email_sent",
} as const;

/** The four message names that show up in the admin panel "Security" tab. */
export const SECURITY_EVENT_MESSAGES: readonly string[] = [
  ADMIN_EVENTS.DISPOSABLE_EMAIL_BLOCKED,
  ADMIN_EVENTS.RATE_LIMIT_HIT,
  ADMIN_EVENTS.AUTH_FAILURE,
  ADMIN_EVENTS.REQUEST_TOO_LARGE,
];

export type AdminEventName = (typeof ADMIN_EVENTS)[keyof typeof ADMIN_EVENTS];

export async function logAdminEvent(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>
) {
  try {
    await supabaseServer.from("admin_logs").insert({
      level,
      message,
      meta: meta ?? null,
    });
  } catch {
    /* avoid throwing from logging */
  }
}

/**
 * Fire-and-forget variant for use in synchronous code paths (rate limit
 * checks, size guards). Errors from the logger never propagate.
 */
export function logAdminEventAsync(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>
): void {
  void logAdminEvent(level, message, meta);
}
