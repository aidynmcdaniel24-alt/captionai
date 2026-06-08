"use client";

type FeatureGateProps = {
  title: string;
  description: string;
  badge?: string;
  checkoutLoading: boolean;
  onStartCheckout: (interval?: "month" | "year") => void;
  requiredPlan: "pro" | "annual";
};

export function FeatureGate({
  title,
  description,
  badge = "Pro",
  checkoutLoading,
  onStartCheckout,
  requiredPlan,
}: FeatureGateProps) {
  return (
    <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-fuchsia-50 p-6 text-center dark:border-purple-500/30 dark:from-purple-950/40 dark:to-fuchsia-950/30">
      <p className="text-3xl" aria-hidden>
        🔒
      </p>
      <h2 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {requiredPlan === "annual" ? (
          <button
            type="button"
            disabled={checkoutLoading}
            onClick={() => onStartCheckout("year")}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-50"
          >
            {checkoutLoading ? "Opening checkout…" : "Upgrade to Annual — $79/yr"}
          </button>
        ) : (
          <button
            type="button"
            disabled={checkoutLoading}
            onClick={() => onStartCheckout("month")}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-purple-500 disabled:opacity-50"
          >
            {checkoutLoading ? "Opening checkout…" : "Upgrade to Pro — $9/mo"}
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        {badge} feature · unlock with {requiredPlan === "annual" ? "Annual" : "Pro"}
      </p>
    </div>
  );
}
