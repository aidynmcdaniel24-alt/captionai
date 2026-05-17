"use client";

import { RequestPayoutPanel } from "@/components/affiliate/RequestPayoutPanel";
import {
  convertUsdCentsToCurrency,
  formatCurrencyAmount,
  PAYOUT_CURRENCIES,
  type ExchangeRatesFromUsd,
  type PayoutCurrency,
} from "@/lib/affiliate-currency";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";

type PayoutInfo = {
  minPayoutCents: number;
  availableCents: number;
  eligible: boolean;
  hasPendingPayout: boolean;
};

type ReferralResponse = {
  code?: string;
  link?: string;
  trackingLink?: string;
  referralsCount?: number;
  stats?: {
    totalClicks: number;
    totalSignups: number;
    totalPayingCustomers: number;
    earningsCents: number;
    earningsFormatted: string;
  };
  payout?: PayoutInfo;
  exchangeRates?: ExchangeRatesFromUsd;
  error?: string;
};

export function AffiliatePageClient() {
  const { isLoaded, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReferralResponse | null>(null);
  const [copied, setCopied] = useState<"track" | "query" | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<PayoutCurrency>("USD");

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/referral");
      const j = (await res.json()) as ReferralResponse;
      if (res.ok) {
        setData(j);
      } else {
        setData({ error: j.error || "Could not load affiliate data." });
      }
    } catch {
      setData({ error: "Network error." });
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load affiliate stats when auth is ready
    void load();
  }, [isLoaded, isSignedIn, load]);

  async function copyToClipboard(text: string, which: "track" | "query") {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  if (!isLoaded) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
        Loading…
      </p>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900/80">
        <p className="text-zinc-700 dark:text-zinc-200">
          Sign in to enroll in the affiliate program and get your tracking link.
        </p>
        <SignInButton mode="modal">
          <button
            type="button"
            className="mt-4 inline-flex rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-500"
          >
            Sign in to enroll
          </button>
        </SignInButton>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading your affiliate dashboard…</p>;
  }

  if (data?.error) {
    return (
      <div className="rounded-xl border border-amber-400/50 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
        {data.error}
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          Run <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">supabase/affiliate_program.sql</code> in the
          Supabase SQL editor if tables are missing.
        </p>
      </div>
    );
  }

  const track = data?.trackingLink ?? "";
  const legacy = data?.link ?? "";
  const stats = data?.stats;
  const payout = data?.payout;
  const exchangeRates = data?.exchangeRates;
  const earningsCents = stats?.earningsCents ?? 0;
  const convertedEarnings =
    exchangeRates != null
      ? formatCurrencyAmount(
          convertUsdCentsToCurrency(earningsCents, displayCurrency, exchangeRates),
          displayCurrency
        )
      : null;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Your tracking link</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Share the short URL below. Clicks are counted when someone opens it; sign-ups are attributed when they create
          an account. You earn <strong className="text-zinc-800 dark:text-zinc-100">20%</strong> on their first Pro
          payment (about <strong>$1.80</strong> per $9/mo and <strong>$15.80</strong> per $79/yr before processor fees).
        </p>
        {track ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="block flex-1 break-all rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
              {track}
            </code>
            <button
              type="button"
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
              onClick={() => copyToClipboard(track, "track")}
            >
              {copied === "track" ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}
        {legacy && legacy !== track ? (
          <p className="mt-3 text-xs text-zinc-500">
            Direct signup URL (same attribution):{" "}
            <button
              type="button"
              className="text-purple-600 underline hover:text-purple-500 dark:text-purple-400"
              onClick={() => copyToClipboard(legacy, "query")}
            >
              {copied === "query" ? "Copied" : "Copy full URL"}
            </button>
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Performance</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Link clicks</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-white">
              {stats?.totalClicks ?? 0}
            </dd>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sign-ups</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-white">
              {stats?.totalSignups ?? data?.referralsCount ?? 0}
            </dd>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Paying (Pro)</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-white">
              {stats?.totalPayingCustomers ?? 0}
            </dd>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/80 p-4 dark:bg-emerald-950/30 sm:col-span-2 lg:col-span-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              Earnings
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
              ${stats?.earningsFormatted ?? "0.00"}
              <span className="text-base font-normal text-emerald-800/80 dark:text-emerald-200/80"> USD</span>
            </dd>
            {exchangeRates ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="sr-only">Display currency</span>
                  <select
                    className="rounded border border-emerald-600/30 bg-white/80 px-2 py-0.5 text-xs text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-100"
                    value={displayCurrency}
                    onChange={(e) => setDisplayCurrency(e.target.value as PayoutCurrency)}
                  >
                    {PAYOUT_CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                {convertedEarnings && displayCurrency !== "USD" ? (
                  <span className="text-sm text-emerald-800 dark:text-emerald-200">≈ {convertedEarnings}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </dl>
        <button
          type="button"
          className="mt-4 text-sm text-purple-600 hover:text-purple-500 dark:text-purple-400"
          onClick={() => void load()}
        >
          Refresh stats
        </button>
        {payout && exchangeRates ? (
          <RequestPayoutPanel payout={payout} exchangeRates={exchangeRates} onSuccess={() => void load()} />
        ) : null}
      </section>
    </div>
  );
}
