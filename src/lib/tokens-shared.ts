/**
 * Token-system constants safe for both client and server. The server-only
 * helpers live in `tokens.ts` and import from here so we never duplicate
 * cost numbers across files.
 */

export const FREE_DAILY_TOKENS = 200;
export const LOW_TOKEN_WARNING_THRESHOLD = 50;

export const TOKEN_COSTS = {
  caption: 10,
  hashtag: 5,
  bio: 5,
  abTest: 15,
  trending: 3,
  image: 5,
} as const;

export type TokenCostKey = keyof typeof TOKEN_COSTS;

export type TokenInfo = {
  plan: "free" | "pro";
  tokensUsed: number;
  tokensLimit: number | null;
  tokensRemaining: number | null;
  date?: string;
  cost?: number;
};
