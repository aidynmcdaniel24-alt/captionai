"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [syncStatus, setSyncStatus] = useState<"waiting" | "pro" | "pending">("waiting");

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    void fetch("/api/billing/sync-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ sessionId }),
    }).catch(() => {
      /* webhook may still apply */
    });
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const maxTries = 25;

    const id = setInterval(async () => {
      tries += 1;
      try {
        const res = await fetch("/api/subscription");
        if (res.ok) {
          const data = (await res.json()) as { plan?: string };
          if (data.plan === "pro" && !cancelled) {
            setSyncStatus("pro");
            clearInterval(id);
            return;
          }
        }
      } catch {
        /* ignore */
      }
      if (tries >= maxTries && !cancelled) {
        setSyncStatus("pending");
        clearInterval(id);
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 px-6 py-16 text-white">
      <div className="w-full max-w-md rounded-2xl border border-emerald-800/60 bg-zinc-900/90 p-8 text-center shadow-xl shadow-emerald-950/20">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">Payment successful</p>
        <h1 className="mt-3 text-3xl font-semibold">Welcome to Pro</h1>
        <p className="mt-4 text-zinc-300">
          Your subscription payment went through. Stripe can email you a receipt automatically (turn this on under Stripe
          Dashboard → Settings → Customer emails).
        </p>

        {syncStatus === "waiting" ? (
          <p className="mt-4 text-sm text-zinc-400">Activating your account…</p>
        ) : null}
        {syncStatus === "pro" ? (
          <p className="mt-4 text-sm text-emerald-400">You are on Pro—unlimited captions are ready.</p>
        ) : null}
        {syncStatus === "pending" ? (
          <p className="mt-4 text-sm text-amber-300">
            Your payment is recorded; it may take a few more seconds to unlock Pro. Refresh the dashboard if needed.
          </p>
        ) : null}

        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-xl bg-purple-600 px-6 py-3 font-medium hover:bg-purple-500"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 px-6 py-16 text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
