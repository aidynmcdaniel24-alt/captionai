"use client";

import { BestTimeCard } from "@/components/dashboard/BestTimeCard";
import { WelcomeOnboardingModal } from "@/components/dashboard/WelcomeOnboardingModal";
import { ChangePhotoButton } from "@/components/ChangePhotoButton";
import { UserAvatar } from "@/components/UserAvatar";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { SignOutButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type BillingInfo = {
  plan: "free" | "pro" | "annual";
  priceLabel: string | null;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
};

function formatBillingDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [plan, setPlan] = useState<"free" | "pro" | "annual" | null>(null);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [totalCaptions, setTotalCaptions] = useState<number | null>(null);
  const [usageToday, setUsageToday] = useState<number | null>(null);
  const [freeLimit, setFreeLimit] = useState(5);
  const [referralsCount, setReferralsCount] = useState<number | null>(null);
  const [refLink, setRefLink] = useState<string | null>(null);
  const [abSummary, setAbSummary] = useState<{ experiments: number; totalPicks: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
      setPlan(
        data.plan === "annual" ? "annual" : data.plan === "pro" ? "pro" : "free"
      );
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

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/billing/subscription", { credentials: "same-origin" });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as BillingInfo & { error?: string };
      const resolvedPlan: "free" | "pro" | "annual" =
        data.plan === "annual" ? "annual" : data.plan === "pro" ? "pro" : "free";
      setBilling({
        plan: resolvedPlan,
        priceLabel: data.priceLabel ?? null,
        nextBillingDate: data.nextBillingDate ?? null,
        cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
      });
      setPlan(resolvedPlan);
    } catch {
      /* ignore */
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in?redirect_url=/profile");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch profile stats once signed in
    void loadStats();
    void loadBilling();
  }, [isSignedIn, loadStats, loadBilling]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/referral");
        if (!res.ok || cancelled) {
          return;
        }
        const data = (await res.json()) as { link?: string; trackingLink?: string };
        const href = data.trackingLink ?? data.link;
        if (href && !cancelled) {
          setRefLink(href);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyReferral() {
    if (!refLink) {
      return;
    }
    await navigator.clipboard.writeText(refLink);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 1500);
  }

  if (!isLoaded || !isSignedIn) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:py-10 dark:bg-gradient-to-b dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
        <div className="mx-auto max-w-lg">
          <Skeleton className="mb-6 h-5 w-36" />
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/70">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="mt-2 h-3.5 w-64" />
            <div className="mt-6 flex items-center gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-48" />
              </div>
            </div>
            <div className="mt-6 space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-40" />
                </div>
              ))}
            </div>
            <div className="mt-6">
              <SkeletonCard lines={2} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? "—";
  const name =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "—";

  const subscriptionPlan = billing?.plan ?? plan;
  const isPro = subscriptionPlan === "pro" || subscriptionPlan === "annual";
  const isAnnual = subscriptionPlan === "annual";

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900 sm:py-10 dark:bg-gradient-to-b dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 dark:text-white">
      <div className="mx-auto max-w-lg">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex min-h-[40px] items-center text-sm font-medium text-purple-600 hover:text-purple-500 sm:mb-6 dark:text-purple-400 dark:hover:text-purple-300"
        >
          ← Back to dashboard
        </Link>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-xl dark:shadow-black/30">
          <h1 className="text-xl font-semibold sm:text-2xl">Your profile</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            View your account details. To change your name or email, use Account settings (Clerk).
          </p>

          <div className="mt-6 flex flex-col items-center gap-4 border-t border-zinc-200 pt-6 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left dark:border-zinc-800">
            <UserAvatar
              imageUrl={user?.imageUrl ?? null}
              name={name === "—" ? null : name}
              email={primaryEmail === "—" ? null : primaryEmail}
              size="xl"
            />
            <div className="flex w-full flex-col items-center gap-2 sm:items-start">
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {name === "—" ? "Welcome" : name}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {user?.imageUrl ? "Your profile photo is visible to your account." : "Add a photo to personalize your account."}
              </p>
              <ChangePhotoButton hasImage={Boolean(user?.imageUrl)} />
            </div>
          </div>

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
                <dt className="text-xs uppercase tracking-wide text-zinc-500">People you referred</dt>
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

          <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Subscription</h2>
            {billingLoading && subscriptionPlan === null ? (
              <p className="mt-3 text-sm text-zinc-500">Loading…</p>
            ) : (
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">Current plan</dt>
                  <dd className="mt-1">
                    {isAnnual ? (
                      <span className="rounded-lg border border-amber-600/80 bg-amber-50 px-2 py-1 text-sm text-amber-900 dark:border-amber-700/80 dark:bg-amber-950/40 dark:text-amber-200">
                        Annual Elite
                      </span>
                    ) : isPro ? (
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
                {isPro && billing?.priceLabel ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">Price</dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{billing.priceLabel}</dd>
                  </div>
                ) : null}
                {isPro ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">
                      {billing?.cancelAtPeriodEnd ? "Pro access until" : "Next billing date"}
                    </dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                      {formatBillingDate(billing?.nextBillingDate ?? null)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/subscription"
                className="rounded-xl border border-zinc-300 px-4 py-3 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Manage Subscription
              </Link>
              {!isPro && subscriptionPlan !== null ? (
                <Link
                  href="/upgrade"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Upgrade to Pro
                </Link>
              ) : null}
            </div>
          </section>

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
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 sm:w-auto dark:border-zinc-600 dark:hover:bg-zinc-800"
              >
                {copiedRef ? "Copied" : "Copy link"}
              </button>
              <p className="mt-3 text-xs text-zinc-500">
                Short URL pattern: <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">/r/code</code> (
                see Affiliate page)
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <Link
              href="/history"
              className="rounded-xl border border-zinc-300 px-4 py-3 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Caption history
            </Link>
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
            <button
              type="button"
              onClick={() => setShowOnboarding(true)}
              className="rounded-xl border border-zinc-300 px-4 py-3 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Help &amp; Tutorial
            </button>
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

      <WelcomeOnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </main>
  );
}
