import "server-only";

import { NextResponse } from "next/server";
import { hasUnlimitedTokens } from "@/lib/admin";
import { logAdminEvent } from "@/lib/admin-log";
import { safeErrorMessage } from "@/lib/security/api-guard";
import { supabaseServer } from "@/lib/supabase/server";
import {
  FREE_DAILY_TOKENS,
  TOKEN_COSTS,
} from "@/lib/tokens-shared";

/**
 * The token system replaces the old "captions per day" limit. Free users
 * get a daily allowance shared across every AI-powered tool. Pro users
 * have no limit but we still record their usage so analytics keep working.
 *
 * The `usage` table's `count` column is reused as "tokens spent today".
 * Old rows simply look like very small balances after the migration —
 * no destructive change required.
 */

export type Plan = "free" | "pro" | "annual";

export {
  FREE_DAILY_TOKENS,
  LOW_TOKEN_WARNING_THRESHOLD,
  TOKEN_COSTS,
} from "@/lib/tokens-shared";

export type TokenCostKey = keyof typeof TOKEN_COSTS;

export function todayDateString(): string {
  return new Date().toISOString().split("T")[0]!;
}

/** Plans with unlimited tokens (no daily cap). */
function planHasUnlimitedTokens(plan: Plan): boolean {
  return plan === "pro" || plan === "annual";
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
  const tokensLimit =
    unlimited || planHasUnlimitedTokens(plan) ? null : FREE_DAILY_TOKENS;
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
 * record the spend. Free users that would exceed the daily limit get a
 * structured 402 response that the client uses to render the Pro
 * upgrade modal. Pro users have no limit, but we still record the spend.
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

  if (plan === "free") {
    const limit = FREE_DAILY_TOKENS;
    if (tokensUsedBefore + cost > limit) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "Daily token limit reached.",
            paywall: true,
            plan: "free" as const,
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

  const tokensLimit = planHasUnlimitedTokens(plan) ? null : FREE_DAILY_TOKENS;
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
