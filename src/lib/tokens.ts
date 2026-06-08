import "server-only";

import { NextResponse } from "next/server";
import { hasUnlimitedTokens } from "@/lib/admin";
import { logAdminEvent } from "@/lib/admin-log";
import { safeErrorMessage } from "@/lib/security/api-guard";
import { supabaseServer } from "@/lib/supabase/server";
import {
  dailyTokenLimitForPlan,
  TOKEN_COSTS,
} from "@/lib/tokens-shared";

/**
 * The token system replaces the old "captions per day" limit. Each plan gets
 * a daily allowance shared across every AI-powered tool:
 *   - Free   : 200 tokens/day
 *   - Pro    : 1000 tokens/day
 *   - Annual : unlimited (no daily cap)
 * Admin accounts always bypass the cap regardless of plan.
 *
 * The `usage` table's `count` column is reused as "tokens spent today".
 * Old rows simply look like very small balances after the migration —
 * no destructive change required.
 */

export type Plan = "free" | "pro" | "annual";

export {
  FREE_DAILY_TOKENS,
  PRO_DAILY_TOKENS,
  LOW_TOKEN_WARNING_THRESHOLD,
  PRO_LOW_TOKEN_WARNING_THRESHOLD,
  TOKEN_COSTS,
  dailyTokenLimitForPlan,
  lowTokenWarningThreshold,
} from "@/lib/tokens-shared";

export type TokenCostKey = keyof typeof TOKEN_COSTS;

export function todayDateString(): string {
  return new Date().toISOString().split("T")[0]!;
}

/** Plans with unlimited tokens (no daily cap). Only Annual qualifies now. */
function planHasUnlimitedTokens(plan: Plan): boolean {
  return plan === "annual";
}

export async function getPlan(userId: string): Promise<Plan> {
  const { data } = await supabaseServer
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.plan === "annual") return "annual";
  if (data?.plan === "pro") return "pro";
  return "free";
}

export type TokenUsage = {
  plan: Plan;
  tokensUsed: number;
  tokensLimit: number | null;
  tokensRemaining: number | null;
  date: string;
};

/** Read the current daily token usage for a user. Pro users get a `null` limit. */
export async function getTokenUsage(
  userId: string,
  knownPlan?: Plan
): Promise<TokenUsage> {
  const date = todayDateString();
  const plan = knownPlan ?? (await getPlan(userId));
  const { data } = await supabaseServer
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  const tokensUsed = Math.max(0, data?.count ?? 0);
  const unlimited = hasUnlimitedTokens(userId);
  const tokensLimit = unlimited ? null : dailyTokenLimitForPlan(plan);
  const tokensRemaining =
    tokensLimit === null ? null : Math.max(0, tokensLimit - tokensUsed);

  return { plan, tokensUsed, tokensLimit, tokensRemaining, date };
}

/**
 * Returns the timestamp at which the user's free tokens reset (midnight
 * UTC of the next day). Useful for the upgrade-popup countdown.
 */
export function nextResetIso(): string {
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow.toISOString();
}

type SpendOk = {
  ok: true;
  plan: Plan;
  tokensUsed: number;
  tokensLimit: number | null;
  tokensRemaining: number | null;
  date: string;
  cost: number;
};

type SpendErr = {
  ok: false;
  response: NextResponse;
};

export type SpendTokensResult = SpendOk | SpendErr;

/**
 * Atomically (best-effort) verify that a user can afford a feature, then
 * record the spend. Free (200/day) and Pro (1000/day) users that would
 * exceed their daily limit get a structured 402 response that the client
 * uses to render the upgrade modal (Pro upsell for Free, Annual upsell for
 * Pro). Annual users are uncapped, but we still record the spend.
 */
export async function spendTokens(
  userId: string,
  cost: number,
  scope: string
): Promise<SpendTokensResult> {
  if (cost <= 0 || hasUnlimitedTokens(userId)) {
    const usage = await getTokenUsage(userId);
    return {
      ok: true,
      plan: usage.plan,
      tokensUsed: usage.tokensUsed,
      tokensLimit: usage.tokensLimit,
      tokensRemaining: usage.tokensRemaining,
      date: usage.date,
      cost: 0,
    };
  }

  const plan = await getPlan(userId);
  const date = todayDateString();

  const { data: usageRow, error: readErr } = await supabaseServer
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (readErr) {
    await logAdminEvent("error", "tokens read failed", {
      userId,
      scope,
      details: readErr.message,
    });
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Could not read your token balance. Please try again in a moment.",
          stage: "tokens-read",
          details: safeErrorMessage(readErr, "Token lookup failed."),
        },
        { status: 500 }
      ),
    };
  }

  const tokensUsedBefore = Math.max(0, usageRow?.count ?? 0);

  const limit = planHasUnlimitedTokens(plan) ? null : dailyTokenLimitForPlan(plan);
  if (limit !== null && tokensUsedBefore + cost > limit) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Daily token limit reached.",
          paywall: true,
          plan,
          cost,
          tokensUsed: tokensUsedBefore,
          tokensLimit: limit,
          tokensRemaining: Math.max(0, limit - tokensUsedBefore),
          resetAt: nextResetIso(),
        },
        { status: 402 }
      ),
    };
  }

  const tokensUsedAfter = tokensUsedBefore + cost;
  const { error: writeErr } = await supabaseServer.from("usage").upsert(
    {
      user_id: userId,
      date,
      count: tokensUsedAfter,
    },
    { onConflict: "user_id,date" }
  );

  if (writeErr) {
    await logAdminEvent("error", "tokens write failed", {
      userId,
      scope,
      details: writeErr.message,
    });
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Could not update your token balance. Please try again in a moment.",
          stage: "tokens-write",
          details: safeErrorMessage(writeErr, "Token update failed."),
        },
        { status: 500 }
      ),
    };
  }

  const tokensLimit = planHasUnlimitedTokens(plan) ? null : dailyTokenLimitForPlan(plan);
  const tokensRemaining =
    tokensLimit === null ? null : Math.max(0, tokensLimit - tokensUsedAfter);

  return {
    ok: true,
    plan,
    tokensUsed: tokensUsedAfter,
    tokensLimit,
    tokensRemaining,
    date,
    cost,
  };
}

/**
 * Build the JSON shape that the dashboard expects whenever an AI route
 * returns a successful response. Keeps every call site consistent.
 */
export function tokenInfoPayload(spend: SpendOk) {
  return {
    plan: spend.plan,
    tokensUsed: spend.tokensUsed,
    tokensLimit: spend.tokensLimit,
    tokensRemaining: spend.tokensRemaining,
    date: spend.date,
    cost: spend.cost,
  };
}
