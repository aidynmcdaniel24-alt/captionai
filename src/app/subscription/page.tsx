"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type BillingInfo = {
  plan: "free" | "pro";
  interval: "month" | "year" | null;
  priceLabel: string | null;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
};

function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SubscriptionPage() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const loadBilling = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/billing/subscription", { credentials: "same-origin" });
      const data = (await res.json()) as BillingInfo & { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not load subscription details.");
        return;
      }
      setInfo({
        plan: data.plan === "pro" ? "pro" : "free",
        interval: data.interval ?? null,
        priceLabel: data.priceLabel ?? null,
        nextBillingDate: data.nextBillingDate ?? null,
        cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
      });
    } catch {
      setError("Could not load subscription details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate billing details on mount
    void loadBilling();
  }, [loadBilling]);

  async function startCheckout(interval: "month" | "year") {
    setCheckoutLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interval === "year" ? { interval: "year" } : {}),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || "Could not start checkout.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function confirmCancel() {
    setCancelLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST", credentials: "same-origin" });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Could not cancel subscription.");
        return;
      }
      setShowCancelConfirm(false);
      setSuccessMessage(
        data.message ||
          "Subscription canceled. You keep Pro access until the end of your billing period."
      );
      await loadBilling();
    } catch {
      setError("Could not cancel subscription.");
    } finally {
      setCancelLoading(false);
    }
  }

  const planLabel = info?.plan === "pro" ? "Pro" : "Free";
  const isMonthlyPro = info?.plan === "pro" && info.interval === "month";
  const isAnnualPro = info?.plan === "pro" && info.interval === "year";

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-gradient-to-b dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 dark:text-white">
      <div className="mx-auto max-w-lg">
        <Link
          href="/profile"
          className="mb-6 inline-flex text-sm font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400"
        >
          ← Back to profile
        </Link>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <h1 className="text-2xl font-semibold">Subscription</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            View your plan, billing, and manage your Pro subscription.
          </p>

          {loading ? (
            <p className="mt-8 text-zinc-500">Loading…</p>
          ) : (
            <dl className="mt-6 space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">Current plan</dt>
                <dd className="mt-1">
                  <span
                    className={
                      info?.plan === "pro"
                        ? "rounded-lg border border-emerald-700/80 bg-emerald-50 px-2 py-1 text-sm text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "rounded-lg border border-zinc-300 bg-zinc-100 px-2 py-1 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-300"
                    }
                  >
                    {planLabel}
                  </span>
                </dd>
              </div>

              {info?.plan === "pro" && info.priceLabel ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">Price</dt>
                  <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{info.priceLabel}</dd>
                </div>
              ) : null}

              {info?.plan === "pro" ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">
                    {info.cancelAtPeriodEnd ? "Pro access until" : "Next billing date"}
                  </dt>
                  <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                    {formatDate(info.nextBillingDate)}
                  </dd>
                </div>
              ) : null}

              {info?.cancelAtPeriodEnd ? (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
                  Your subscription will not renew. You keep Pro until{" "}
                  {formatDate(info.nextBillingDate)}.
                </p>
              ) : null}
            </dl>
          )}

          {error ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          {successMessage ? (
            <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300" role="status">
              {successMessage}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            {info?.plan === "free" ? (
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={() => startCheckout("month")}
                className="rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-60"
              >
                {checkoutLoading ? "Opening checkout…" : "Upgrade to Pro — $9/month"}
              </button>
            ) : null}

            {isMonthlyPro && !info.cancelAtPeriodEnd ? (
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={() => startCheckout("year")}
                className="rounded-xl border border-emerald-500/50 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-60 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
              >
                {checkoutLoading ? "Opening checkout…" : "Switch to Annual plan — Save 27%"}
              </button>
            ) : null}

            {isAnnualPro ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                You are on the annual Pro plan ($79/year).
              </p>
            ) : null}

            {info?.plan === "pro" && !info.cancelAtPeriodEnd ? (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200"
              >
                Cancel subscription
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {showCancelConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <h2 id="cancel-title" className="text-lg font-semibold">
              Cancel subscription?
            </h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to cancel? You will keep Pro access until the end of your billing
              period.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelLoading}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium dark:border-zinc-600"
              >
                Keep Pro
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={cancelLoading}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
              >
                {cancelLoading ? "Canceling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
