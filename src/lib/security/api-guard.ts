import "server-only";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { logAdminEvent } from "@/lib/admin-log";
import {
  clientIp,
  enforceRateLimit,
  RATE_LIMITS,
  type RateLimitOptions,
} from "./rate-limit";

export type RequireUserResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Verify that the caller has an authenticated Clerk session. Failed
 * attempts are logged into `admin_logs` with the request's client IP
 * and User-Agent (truncated) so admins can spot enumeration / abuse.
 * The client only ever sees `{"error": "Unauthorized"}` — never an
 * internal stack trace.
 */
export async function requireUser(
  req: Request,
  scope: string
): Promise<RequireUserResult> {
  const { userId } = await auth();
  if (!userId) {
    let path = "";
    try {
      path = new URL(req.url).pathname;
    } catch {
      /* ignore malformed URL */
    }
    await logAdminEvent("warn", "auth-failed", {
      scope,
      path,
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    });
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, userId };
}

/**
 * Convert any thrown error into a generic message for the client while
 * the verbose original is left in admin_logs / server stdout. In
 * development we keep the original message so we can debug faster.
 */
export function safeErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (process.env.NODE_ENV === "development") {
    return err instanceof Error ? err.message : String(err);
  }
  return fallback;
}

/** Rate-limit anonymous endpoints by client IP. */
export function rateLimitByIp(
  req: Request,
  scope: string,
  opts: RateLimitOptions = RATE_LIMITS.generalApi,
  message?: string
): NextResponse | null {
  return enforceRateLimit(scope, clientIp(req), opts, message);
}

/** Rate-limit authenticated endpoints by Clerk user id. */
export function rateLimitByUser(
  userId: string,
  scope: string,
  opts: RateLimitOptions = RATE_LIMITS.generalApi,
  message?: string
): NextResponse | null {
  return enforceRateLimit(scope, userId, opts, message);
}

export { clientIp, RATE_LIMITS };
