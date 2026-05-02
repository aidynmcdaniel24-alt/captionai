"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";

const platforms = ["Instagram", "TikTok", "LinkedIn", "Twitter/X"] as const;
const tones = ["funny", "professional", "hype", "inspirational"] as const;

type ApiResult = {
  captions?: string[];
  plan?: "free" | "pro";
  usage?: {
    count: number;
    limit: number | null;
    date: string;
  };
  error?: string;
  details?: string;
  stage?: string;
  paywall?: boolean;
  limit?: number;
  count?: number;
};

export default function DashboardPage() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<(typeof platforms)[number]>("Instagram");
  const [tone, setTone] = useState<(typeof tones)[number]>("inspirational");
  const [captions, setCaptions] = useState<string[]>([]);
  const [usageText, setUsageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [plan, setPlan] = useState<"free" | "pro" | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/subscription");
        const data = (await res.json()) as { plan?: string };
        if (cancelled) {
          return;
        }
        setPlan(data.plan === "pro" ? "pro" : "free");
      } catch {
        if (!cancelled) {
          setPlan("free");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshPlan() {
    try {
      const res = await fetch("/api/subscription");
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { plan?: string };
      setPlan(data.plan === "pro" ? "pro" : "free");
    } catch {
      /* ignore */
    }
  }

  async function startCheckout() {
    setCheckoutLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok) {
        setError(data.error || "Could not start checkout.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Checkout did not return a URL.");
    } catch {
      setError("Could not connect to checkout. Try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    setError("");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok) {
        setError(data.error || "Could not open billing portal.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Billing portal did not return a URL.");
    } catch {
      setError("Could not open billing portal. Try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleGenerate() {
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/captions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, tone }),
      });

      const data = (await res.json()) as ApiResult;

      if (!res.ok) {
        if (data.paywall) {
          setShowPaywall(true);
          setUsageText(`Free limit reached: ${data.count}/${data.limit} used today.`);
          setCaptions([]);
          return;
        }

        const fullError = [data.error, data.stage ? `(stage: ${data.stage})` : null, data.details]
          .filter(Boolean)
          .join(" ");
        setError(fullError || "Something went wrong.");
        return;
      }

      setShowPaywall(false);
      setCaptions(data.captions ?? []);

      if (data.usage?.limit) {
        setUsageText(`Free plan usage: ${data.usage.count}/${data.usage.limit} today`);
      } else {
        setUsageText(`Pro plan: unlimited usage`);
      }
      await refreshPlan();
    } catch {
      setError("Could not generate captions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy(caption: string, index: number) {
    await navigator.clipboard.writeText(caption);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1200);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 px-6 py-8 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-widest text-purple-300">CaptionAI</p>
            <h1 className="text-3xl font-semibold">AI Caption Studio</h1>
          </div>
          <div className="flex items-center gap-3">
            {plan === "free" ? (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_22px_-4px_rgba(168,85,247,0.7)] transition hover:bg-purple-500 hover:shadow-[0_0_28px_-4px_rgba(192,132,252,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                disabled={checkoutLoading}
                onClick={startCheckout}
              >
                {checkoutLoading ? "Opening checkout…" : "Upgrade to Pro — $9/mo"}
              </button>
            ) : plan === "pro" ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-emerald-800/80 bg-emerald-950/40 px-3 py-1.5 text-sm text-emerald-300">
                  Pro
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-zinc-600 bg-zinc-800/80 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:opacity-60"
                  disabled={portalLoading}
                  onClick={openBillingPortal}
                >
                  {portalLoading ? "Opening portal…" : "Manage subscription"}
                </button>
              </div>
            ) : null}
            <UserButton />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl shadow-purple-950/20">
          <label className="mb-2 block text-sm text-zinc-300">Photo/topic description</label>
          <textarea
            className="min-h-32 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-purple-500"
            placeholder="Example: my coffee shop in New Orleans"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-zinc-300">Platform</label>
              <select
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-2.5"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as (typeof platforms)[number])}
              >
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-300">Tone</label>
              <select
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-2.5"
                value={tone}
                onChange={(e) => setTone(e.target.value as (typeof tones)[number])}
              >
                {tones.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="mt-4 rounded-xl bg-purple-600 px-5 py-2.5 font-medium hover:bg-purple-500 disabled:opacity-70"
            disabled={isLoading}
            onClick={handleGenerate}
          >
            {isLoading ? "Generating..." : "Generate captions"}
          </button>

          {usageText ? <p className="mt-3 text-sm text-zinc-300">{usageText}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        </div>

        {captions.length > 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h2 className="mb-3 text-xl font-semibold">Your captions</h2>
            <ul className="space-y-3">
              {captions.map((caption, index) => (
                <li
                  key={`${caption}-${index}`}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-zinc-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="leading-7">{caption}</p>
                    <button
                      className="shrink-0 rounded-lg border border-zinc-600 px-3 py-1.5 text-sm hover:bg-zinc-800"
                      onClick={() => handleCopy(caption, index)}
                    >
                      {copiedIndex === index ? "Copied" : "Copy"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {showPaywall ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-center">
            <h3 className="text-2xl font-semibold">Free Limit Reached</h3>
            <p className="mt-2 text-zinc-300">
              You have used all 5 free captions for today. Upgrade to Pro for unlimited usage.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                className="rounded-md border border-zinc-600 px-4 py-2 hover:bg-zinc-800"
                onClick={() => setShowPaywall(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-purple-600 px-8 py-3 text-base font-bold text-white shadow-[0_0_24px_-4px_rgba(168,85,247,0.75)] transition hover:bg-purple-500 hover:shadow-[0_0_32px_-4px_rgba(192,132,252,0.55)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                disabled={checkoutLoading}
                onClick={startCheckout}
              >
                {checkoutLoading ? "Opening Stripe…" : "Upgrade to Pro"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
