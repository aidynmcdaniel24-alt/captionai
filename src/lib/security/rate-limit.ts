import "server-only";
import { NextResponse } from "next/server";

/**
 * In-memory sliding-window rate limiter.
 *
 * Keys live in a single Map shared by the Node.js process. On Vercel each
 * serverless instance keeps its own counters, so the practical limit is
 * "per-instance per-window". That is intentional for a free-tier setup —
 * users that want strict global limits can layer Upstash Redis on top of
 * this helper later without touching call sites.
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

let insertsSinceCleanup = 0;
function sweep(now: number) {
  insertsSinceCleanup++;
  if (insertsSinceCleanup < 1024) return;
  insertsSinceCleanup = 0;
  for (const [key, value] of store) {
    if (value.resetAt <= now) store.delete(key);
  }
}

export type RateLimitOptions = {
  /** Maximum requests per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number; retryAfter: number };

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    sweep(now);
    return { ok: true, remaining: opts.max - 1, resetAt: now + opts.windowMs };
  }

  if (existing.count >= opts.max) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: opts.max - existing.count,
    resetAt: existing.resetAt,
  };
}

export function rateLimitResponse(
  result: Extract<RateLimitResult, { ok: false }>,
  message = "Too many requests. Please slow down."
): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

/**
 * Pre-built rate-limit policies for the limits requested in the
 * security review. Always go through these so all call sites stay
 * consistent.
 */
export const RATE_LIMITS = {
  captionGenerate: { max: 10, windowMs: 60_000 } satisfies RateLimitOptions,
  auth: { max: 5, windowMs: 60_000 } satisfies RateLimitOptions,
  contact: { max: 3, windowMs: 60 * 60_000 } satisfies RateLimitOptions,
  affiliateClick: { max: 50, windowMs: 60 * 60_000 } satisfies RateLimitOptions,
  generalApi: { max: 100, windowMs: 60_000 } satisfies RateLimitOptions,
  demo: { max: 12, windowMs: 60 * 60_000 } satisfies RateLimitOptions,
  adminApi: { max: 100, windowMs: 60_000 } satisfies RateLimitOptions,
  publicRead: { max: 60, windowMs: 60_000 } satisfies RateLimitOptions,
} as const;

/**
 * One-shot helper: enforce a limit and return a 429 response if exceeded,
 * otherwise return null and let the caller continue.
 */
export function enforceRateLimit(
  scope: string,
  identifier: string,
  options: RateLimitOptions,
  message?: string
): NextResponse | null {
  const result = checkRateLimit(`${scope}:${identifier}`, options);
  if (!result.ok) return rateLimitResponse(result, message);
  return null;
}
