import { NextResponse } from "next/server";
import { ADMIN_EVENTS, SECURITY_EVENT_MESSAGES } from "@/lib/admin-log";
import { resolveIsClerkAdmin } from "@/lib/admin";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type SecurityLogRow = {
  id: string;
  level: string;
  message: string;
  meta: unknown;
  created_at: string;
};

export type SecurityTotals = {
  disposable_email_blocked: number;
  rate_limit_hit: number;
  auth_failure: number;
  request_too_large: number;
};

async function countByMessage(message: string): Promise<{ count: number; warning?: string }> {
  const { count, error } = await supabaseServer
    .from("admin_logs")
    .select("*", { count: "exact", head: true })
    .eq("message", message);
  if (error) {
    return { count: 0, warning: `count(${message}): ${error.message}` };
  }
  return { count: count ?? 0 };
}

export async function GET(req: Request) {
  const authResult = await requireUser(req, "admin:security");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  if (!(await resolveIsClerkAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimited = rateLimitByUser(userId, "admin:security", RATE_LIMITS.adminApi);
  if (rateLimited) return rateLimited;

  const warnings: string[] = [];

  const { data, error } = await supabaseServer
    .from("admin_logs")
    .select("id, level, message, meta, created_at")
    .in("message", [...SECURITY_EVENT_MESSAGES])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not load security events.") },
      { status: 500 }
    );
  }

  const [disposable, rateHit, authFail, tooLarge] = await Promise.all([
    countByMessage(ADMIN_EVENTS.DISPOSABLE_EMAIL_BLOCKED),
    countByMessage(ADMIN_EVENTS.RATE_LIMIT_HIT),
    countByMessage(ADMIN_EVENTS.AUTH_FAILURE),
    countByMessage(ADMIN_EVENTS.REQUEST_TOO_LARGE),
  ]);

  for (const { warning } of [disposable, rateHit, authFail, tooLarge]) {
    if (warning) warnings.push(warning);
  }

  const totals: SecurityTotals = {
    disposable_email_blocked: disposable.count,
    rate_limit_hit: rateHit.count,
    auth_failure: authFail.count,
    request_too_large: tooLarge.count,
  };

  return NextResponse.json({
    items: (data ?? []) as SecurityLogRow[],
    totals,
    warnings,
  });
}
