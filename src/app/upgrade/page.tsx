"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function UpgradeCheckout() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const annual =
      searchParams.get("billing") === "annual" || searchParams.get("plan") === "annual";

    async function startCheckout() {
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(annual ? { interval: "year" } : {}),
        });
        const data = (await res.json()) as { url?: string; error?: string };

        if (!res.ok) {
          throw new Error(data.error || "Could not start checkout.");
        }
        if (data.url && !cancelled) {
          window.location.href = data.url;
          return;
        }
        throw new Error("Checkout URL missing.");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Something went wrong.");
          setPending(false);
        }
      }
    }

    startCheckout();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 px-6 py-16 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center">
        {pending && !error ? (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <p className="mt-6 text-lg font-medium">Opening secure Stripe checkout…</p>
            <p className="mt-2 text-sm text-zinc-400">You will be redirected to enter payment details.</p>
          </>
        ) : null}

        {error ? (
          <>
            <h1 className="text-xl font-semibold text-red-400">Checkout could not start</h1>
            <p className="mt-3 text-zinc-300">{error}</p>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex rounded-xl bg-zinc-800 px-5 py-3 font-medium hover:bg-zinc-700"
            >
              Return to dashboard
            </Link>
          </>
        ) : null}
      </div>
    </main>
  );
}

export default function UpgradePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 px-6 py-16 text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </main>
      }
    >
      <UpgradeCheckout />
    </Suspense>
  );
}
