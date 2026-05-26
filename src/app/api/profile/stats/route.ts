import { NextResponse } from "next/server";
import { resolveIsClerkAdmin } from "@/lib/admin";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
} from "@/lib/security/api-guard";
import { supabaseServer } from "@/lib/supabase/server";
import {
  FREE_DAILY_TOKENS,
  nextResetIso,
  TOKEN_COSTS,
} from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayUtc() {
  return new Date().toISOString().split("T")[0]!;
}

export async function GET(req: Request) {
  const authResult = await requireUser(req, "profile:stats");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "profile:stats", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const { data: sub } = await supabaseServer
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  const plan = sub?.plan === "pro" ? "pro" : "free";

  let totalCaptions = 0;
  const { count, error: countError } = await supabaseServer
    .from("caption_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (!countError && typeof count === "number") {
    totalCaptions = count;
  }

  const date = todayUtc();
  const { data: usageRow } = await supabaseServer
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  let referralsCount = 0;
  const { count: refCount, error: refErr } = await supabaseServer
    .from("affiliate_signup_attributions")
    .select("*", { count: "exact", head: true })
    .eq("affiliate_user_id", userId);
  if (!refErr && typeof refCount === "number") {
    referralsCount = refCount;
  } else {
    const { count: legacyCount, error: legErr } = await supabaseServer
      .from("referral_claims")
      .select("*", { count: "exact", head: true })
      .eq("referrer_user_id", userId);
    if (!legErr && typeof legacyCount === "number") {
      referralsCount = legacyCount;
    }
  }

  let abSummary = { experiments: 0, totalPicks: 0 };
  const { data: abRows, error: abErr } = await supabaseServer
    .from("ab_experiments")
    .select("picks_a, picks_b")
    .eq("user_id", userId);

  if (!abErr && abRows?.length) {
    abSummary = {
      experiments: abRows.length,
      totalPicks: abRows.reduce((s, r) => s + (r.picks_a ?? 0) + (r.picks_b ?? 0), 0),
    };
  }

  const tokensUsed = Math.max(0, usageRow?.count ?? 0);
  const tokensLimit = plan === "pro" ? null : FREE_DAILY_TOKENS;
  const tokensRemaining =
    tokensLimit === null ? null : Math.max(0, tokensLimit - tokensUsed);

  return NextResponse.json({
    plan,
    totalCaptions,
    // Legacy fields kept for any callers still reading them.
    usageToday: tokensUsed,
    freeLimit: FREE_DAILY_TOKENS,
    // New token system
    tokensUsed,
    tokensLimit,
    tokensRemaining,
    tokenCosts: TOKEN_COSTS,
    resetAt: nextResetIso(),
    referralsCount,
    abSummary,
    isAdmin: await resolveIsClerkAdmin(userId),
  });
}
