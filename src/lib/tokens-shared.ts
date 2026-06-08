/**
 * Token-system constants safe for both client and server. The server-only
 * helpers live in `tokens.ts` and import from here so we never duplicate
 * cost numbers across files.
 */

export const FREE_DAILY_TOKENS = 200;
export const PRO_DAILY_TOKENS = 1000;

/** Free-plan low-balance warning threshold (tokens remaining). */
export const LOW_TOKEN_WARNING_THRESHOLD = 50;
/** Pro-plan low-balance warning threshold (tokens remaining). */
export const PRO_LOW_TOKEN_WARNING_THRESHOLD = 200;

export type PlanName = "free" | "pro" | "annual";

/**
 * Daily token cap for a plan. Annual is uncapped (returns `null`). Admin
 * overrides are handled separately at the call site via `hasUnlimitedTokens`.
 */
export function dailyTokenLimitForPlan(plan: PlanName | null | undefined): number | null {
  if (plan === "annual") return null;
  if (plan === "pro") return PRO_DAILY_TOKENS;
  return FREE_DAILY_TOKENS;
}

/** Tokens-remaining threshold under which we nudge the user to upgrade. */
export function lowTokenWarningThreshold(plan: PlanName | null | undefined): number {
  return plan === "pro"
    ? PRO_LOW_TOKEN_WARNING_THRESHOLD
    : LOW_TOKEN_WARNING_THRESHOLD;
}

export const TOKEN_COSTS = {
  caption: 10,
  hashtag: 5,
  bio: 5,
  abTest: 15,
  trending: 3,
  image: 5,
  // New AI tools
  rewrite: 5,
  translate: 5,
  emoji: 3,
  optimizeLength: 3,
  hashtagStrategy: 8,
  grade: 8,
  competitor: 8,
  calendar: 40,
} as const;

export type TokenCostKey = keyof typeof TOKEN_COSTS;

export type TokenInfo = {
  plan: "free" | "pro" | "annual";
  tokensUsed: number;
  tokensLimit: number | null;
  tokensRemaining: number | null;
  date?: string;
  cost?: number;
};
