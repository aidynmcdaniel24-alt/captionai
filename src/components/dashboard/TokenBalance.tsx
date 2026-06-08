"use client";

import { isAnnualPlan } from "@/lib/plan";
import { lowTokenWarningThreshold } from "@/lib/tokens-shared";

type Props = {
  plan: "free" | "pro" | "annual" | null;
  tokensUsed: number | null;
  tokensLimit: number | null;
  tokensRemaining: number | null;
};

/**
 * Compact token balance widget that lives in the dashboard header. Renders
 * an "Annual — Unlimited" badge for Annual (and admin) accounts, and a
 * coin-counter + progress bar for metered plans (Free 200/day, Pro
 * 1000/day). The progress bar shifts color toward red as the balance gets
 * low so the user can feel the pressure to upgrade.
 */
export function TokenBalance({
  plan,
  tokensUsed,
  tokensLimit,
  tokensRemaining,
}: Props) {
  // Annual is truly unlimited; admins get a null limit on any plan.
  const unlimited = isAnnualPlan(plan) || tokensLimit === null;

  if (unlimited) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full border border-purple-300/70 bg-gradient-to-r from-purple-100 to-fuchsia-100 px-3 py-1.5 text-xs font-semibold text-purple-900 shadow-sm dark:border-purple-500/40 dark:from-purple-950/60 dark:to-fuchsia-950/60 dark:text-purple-100"
        aria-label="Unlimited tokens"
      >
        <span aria-hidden>{isAnnualPlan(plan) ? "✨" : "♾️"}</span>
        <span>{isAnnualPlan(plan) ? "Annual — Unlimited" : "Unlimited tokens"}</span>
      </div>
    );
  }

  // Free and Pro both get a metered coin counter + progress bar.
  if ((plan !== "free" && plan !== "pro") || tokensUsed === null) {
    return null;
  }

  const remaining =
    typeof tokensRemaining === "number"
      ? tokensRemaining
      : Math.max(0, tokensLimit - tokensUsed);
  const used = Math.min(tokensLimit, Math.max(0, tokensUsed));
  const pct = Math.min(100, Math.round((used / tokensLimit) * 100));
  const low = remaining <= lowTokenWarningThreshold(plan);

  // Colors progress from green → amber → red as the user spends down.
  const barColor =
    pct >= 90
      ? "from-rose-500 via-red-500 to-orange-500"
      : pct >= 75
        ? "from-amber-500 via-orange-500 to-rose-500"
        : "from-emerald-500 via-teal-500 to-purple-500";

  return (
    <div
      className="flex w-full max-w-xs flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm sm:w-auto dark:border-zinc-700 dark:bg-zinc-900/80"
      aria-label={`${remaining} of ${tokensLimit} tokens remaining`}
    >
      <div className="flex items-center justify-between gap-3 text-xs font-medium">
        <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-200">
          <span aria-hidden>🪙</span>
          <span className="tabular-nums">
            {remaining} / {tokensLimit}
          </span>
        </span>
        {low ? (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
            role="status"
          >
            ⚠️ Low
          </span>
        ) : null}
      </div>
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={tokensLimit}
        aria-valuenow={used}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-[width] duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {low ? (
        <p className="text-[11px] font-medium leading-tight text-amber-700 dark:text-amber-300">
          ⚠️ {remaining} tokens remaining today
        </p>
      ) : null}
    </div>
  );
}
