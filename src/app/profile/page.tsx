"use client";

import { BestTimeCard } from "@/components/dashboard/BestTimeCard";
import { SignOutButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [plan, setPlan] = useState<"free" | "pro" | null>(null);
  const [totalCaptions, setTotalCaptions] = useState<number | null>(null);
  const [usageToday, setUsageToday] = useState<number | null>(null);
  const [freeLimit, setFreeLimit] = useState(5);
  const [referralsCount, setReferralsCount] = useState<number | null>(null);
  const [refLink, setRefLink] = useState<string | null>(null);
  const [abSummary, setAbSummary] = useState<{ experiments: number; totalPicks: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/stats");
      if (!res.ok) {
        setIsAdmin(false);
        return;
      }
      const data = (await res.json()) as {
        plan?: string;
        totalCaptions?: number;
        usageToday?: number;
        freeLimit?: number;
        referralsCount?: number;
        abSummary?: { experiments: number; totalPicks: number };
        isAdmin?: boolean;
      };
      setPlan(data.plan === "pro" ? "pro" : "free");
      setTotalCaptions(typeof data.totalCaptions === "number" ? data.totalCaptions : 0);
      if (typeof data.usageToday === "number") {
        setUsageToday(data.usageToday);
      }
      if (typeof data.freeLimit === "number") {
        setFreeLimit(data.freeLimit);
      }
      if (typeof data.referralsCount === "number") {
        setReferralsCount(data.referralsCount);
      }
      if (data.abSummary) {
        setAbSummary(data.abSummary);
      }
      setIsAdmin(data.isAdmin === true);
    } catch {
      setTotalCaptions(0);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/referral");
        if (!res.ok || cancelled) {
          return;
        }
        const data = (await res.json()) as { link?: string };
        if (data.link && !cancelled) {
          setRefLink(data.link);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
      }
    } finally {
      setPortalLoading(false);
    }
  }

  async function copyReferral() {
    if (!refLink) {
      return;
    }
    await navigator.clipboard.writeText(refLink);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 1500);
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-12 dark:bg-gradient-to-b dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
        <div className="mx-auto max-w-lg animate-pulse rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </main>
    );
  }

  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? "—";
  const name =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "—";

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-gradient-to-b dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 dark:text-white">
      <div className="mx-auto max-w-lg">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex text-sm font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
        >
          ← Back to dashboard
        </Link>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-xl dark:shadow-black/30">
          <h1 className="text-2xl font-semibold">Your profile</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            View your account details. To change your name or email, use Account settings (Clerk).
          </p>

          <dl className="mt-6 space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Name</dt>
              <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Email</dt>
              <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{primaryEmail}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Plan</dt>
              <dd className="mt-1">
                {plan === null ? (
                  <span className="text-zinc-500">Loading…</span>
                ) : plan === "pro" ? (
                  <span className="rounded-lg border border-emerald-700/80 bg-emerald-50 px-2 py-1 text-sm text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Pro
                  </span>
                ) : (
                  <span className="rounded-lg border border-zinc-300 bg-zinc-100 px-2 py-1 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
                    Free
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Captions generated (saved)</dt>
              <dd className="mt-1 font-mono text-lg text-zinc-900 dark:text-zinc-100">
                {totalCaptions === null ? "…" : totalCaptions}
              </dd>
            </div>
            {plan === "free" && usageToday !== null ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">Free generations today</dt>
                <dd className="mt-1 font-mono text-lg text-zinc-900 dark:text-zinc-100">
                  {usageToday} / {freeLimit}
                </dd>
              </div>
            ) : null}
            {referralsCount !== null ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">Referrals joined</dt>
                <dd className="mt-1 font-mono text-lg text-zinc-900 dark:text-zinc-100">{referralsCount}</dd>
              </div>
            ) : null}
            {abSummary ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">A/B tests</dt>
                <dd className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {abSummary.experiments} saved · {abSummary.totalPicks} outcome taps
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-6">
            <BestTimeCard platform="Instagram" />
          </div>

          {refLink ? (
            <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Referral link</p>
              <p className="mt-2 break-all text-sm text-zinc-800 dark:text-zinc-200">{refLink}</p>
              <button
                type="button"
                onClick={copyReferral}
                className="mt-3 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
              >
                {copiedRef ? "Copied" : "Copy link"}
              </button>
              <p className="mt-2 text-xs text-zinc-500">
                Short URL pattern: <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">/r/code</code> (
                see Affiliate page)
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <Link
              href="/settings"
              className="rounded-xl border border-purple-500/40 bg-purple-50 px-4 py-3 text-center text-sm font-medium text-purple-900 hover:bg-purple-100 dark:bg-purple-950/30 dark:text-purple-200 dark:hover:bg-purple-950/50"
            >
              Edit name &amp; email in Account settings
            </Link>
            <Link
              href="/settings/security"
              className="rounded-xl border border-zinc-300 px-4 py-3 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Two-factor authentication (2FA)
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className="rounded-xl border border-purple-500/50 bg-purple-50 px-4 py-3 text-center text-sm font-medium text-purple-900 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-950/60"
              >
                Admin panel
              </Link>
            ) : null}
            {plan === "pro" ? (
              <button
                type="button"
                className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                disabled={portalLoading}
                onClick={openBillingPortal}
              >
                {portalLoading ? "Opening portal…" : "Manage subscription"}
              </button>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/upgrade"
                  className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Upgrade monthly
                </Link>
                <Link
                  href="/upgrade?billing=annual"
                  className="flex-1 rounded-xl border border-emerald-500/50 px-4 py-3 text-center text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
                >
                  Upgrade $79/yr
                </Link>
              </div>
            )}
            <SignOutButton>
              <button
                type="button"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200 dark:hover:bg-red-950/40"
              >
                Log out
              </button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </main>
  );
}
