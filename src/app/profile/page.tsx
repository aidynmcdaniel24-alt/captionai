"use client";

import { SignOutButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [plan, setPlan] = useState<"free" | "pro" | null>(null);
  const [totalCaptions, setTotalCaptions] = useState<number | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile/stats");
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as { plan?: string; totalCaptions?: number };
        if (cancelled) {
          return;
        }
        setPlan(data.plan === "pro" ? "pro" : "free");
        setTotalCaptions(typeof data.totalCaptions === "number" ? data.totalCaptions : 0);
      } catch {
        if (!cancelled) {
          setTotalCaptions(0);
        }
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

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 px-4 py-12 text-white">
        <div className="mx-auto max-w-lg animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
          <div className="h-8 w-48 rounded bg-zinc-800" />
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
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 px-4 py-10 text-white">
      <div className="mx-auto max-w-lg">
        <Link href="/dashboard" className="mb-6 inline-flex text-sm font-medium text-purple-400 hover:text-purple-300">
          ← Back to dashboard
        </Link>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/30">
          <h1 className="text-2xl font-semibold">Your profile</h1>
          <p className="mt-1 text-sm text-zinc-400">
            View your account details. To change your name or email, use Account settings (Clerk).
          </p>

          <dl className="mt-6 space-y-4 border-t border-zinc-800 pt-6">
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Name</dt>
              <dd className="mt-1 text-zinc-100">{name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Email</dt>
              <dd className="mt-1 text-zinc-100">{primaryEmail}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Plan</dt>
              <dd className="mt-1">
                {plan === null ? (
                  <span className="text-zinc-500">Loading…</span>
                ) : plan === "pro" ? (
                  <span className="rounded-lg border border-emerald-800/80 bg-emerald-950/40 px-2 py-1 text-sm text-emerald-300">
                    Pro
                  </span>
                ) : (
                  <span className="rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm text-zinc-300">
                    Free
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Captions generated (saved)</dt>
              <dd className="mt-1 font-mono text-lg text-zinc-100">
                {totalCaptions === null ? "…" : totalCaptions}
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-col gap-3 border-t border-zinc-800 pt-6">
            <Link
              href="/settings"
              className="rounded-xl border border-purple-500/40 bg-purple-950/30 px-4 py-3 text-center text-sm font-medium text-purple-200 hover:bg-purple-950/50"
            >
              Edit name &amp; email in Account settings
            </Link>
            <Link
              href="/settings/security"
              className="rounded-xl border border-zinc-600 px-4 py-3 text-center text-sm font-medium text-zinc-200 hover:bg-zinc-800"
            >
              Two-factor authentication (2FA)
            </Link>
            {plan === "pro" ? (
              <button
                type="button"
                className="rounded-xl border border-zinc-600 px-4 py-3 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:opacity-60"
                disabled={portalLoading}
                onClick={openBillingPortal}
              >
                {portalLoading ? "Opening portal…" : "Manage subscription"}
              </button>
            ) : (
              <Link
                href="/upgrade"
                className="rounded-xl border border-zinc-600 px-4 py-3 text-center text-sm font-medium text-zinc-200 hover:bg-zinc-800"
              >
                Upgrade to Pro
              </Link>
            )}
            <SignOutButton>
              <button
                type="button"
                className="rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm font-medium text-red-200 hover:bg-red-950/40"
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
