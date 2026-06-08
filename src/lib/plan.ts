/**
 * Central plan-tier helpers. The app has three tiers:
 *   - free   : 200 daily tokens, 3 caption options, basic tools.
 *   - pro     ($9/mo)  : unlimited tokens, 5 caption options, Pro tools.
 *   - annual  ($79/yr) : everything in Pro + Elite quality, 7 caption options,
 *                        and the Annual-only tools (Hashtag Analyzer, Grader,
 *                        Competitor Analyzer, Calendar, Brand Tone Profiles).
 *
 * `annual` is a true authorization tier stored in `subscriptions.plan`, not
 * just a Stripe billing interval. Use `isProPlan` for "Pro or better" feature
 * gates and `isAnnualPlan` for Annual-exclusive gates.
 */

export type PlanTier = "free" | "pro" | "annual";

/** Normalize any stored/looked-up plan string into a known tier. */
export function normalizePlan(
  plan: string | null | undefined
): PlanTier {
  if (plan === "annual") return "annual";
  if (plan === "pro") return "pro";
  return "free";
}

/** True when the plan has Pro-level access (Pro OR Annual). */
export function isProPlan(plan: string | null | undefined): boolean {
  return plan === "pro" || plan === "annual";
}

/** True only for the top-tier Annual (Elite) plan. */
export function isAnnualPlan(plan: string | null | undefined): boolean {
  return plan === "annual";
}

/** Number of caption options generated per request for the given plan. */
export function captionCountForPlan(plan: string | null | undefined): number {
  if (plan === "annual") return 7;
  if (plan === "pro") return 5;
  return 3;
}

/** Human-readable label for a plan tier. */
export function planLabel(plan: string | null | undefined): string {
  if (plan === "annual") return "Annual";
  if (plan === "pro") return "Pro";
  return "Free";
}
