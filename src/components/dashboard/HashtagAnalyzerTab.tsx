"use client";

import { FeatureGate } from "@/components/dashboard/FeatureGate";
import { TokenCounter } from "@/components/dashboard/TokenCounter";
import { isAnnualPlan } from "@/lib/plan";
import { TOKEN_COSTS, type TokenInfo } from "@/lib/tokens-shared";
import { useState } from "react";

const PLATFORMS = ["Instagram", "TikTok", "LinkedIn", "Twitter/X", "Facebook", "YouTube"];

type Entry = { tag: string; reason: string };
type Strategy = {
  broad: Entry[];
  medium: Entry[];
  niche: Entry[];
  trending: Entry[];
};

type Props = {
  plan: "free" | "pro" | "annual" | null;
  tokensRemaining: number | null;
  tokensLimit: number | null;
  checkoutLoading: boolean;
  onStartCheckout: (interval?: "month" | "year") => void;
  onApplyTokenInfo: (info?: TokenInfo | null) => void;
};

function TagSection({ title, subtitle, tags }: { title: string; subtitle: string; tags: Entry[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
      <p className="text-xs text-zinc-500">{subtitle}</p>
      <ul className="mt-2 space-y-2">
        {tags.map((t) => (
          <li
            key={t.tag}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <span className="font-medium text-purple-700 dark:text-purple-300">{t.tag}</span>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{t.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HashtagAnalyzerTab({
  plan,
  tokensRemaining,
  tokensLimit,
  checkoutLoading,
  onStartCheckout,
  onApplyTokenInfo,
}: Props) {
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [strategy, setStrategy] = useState<Strategy | null>(null);

  if (!isAnnualPlan(plan)) {
    return (
      <FeatureGate
        title="Hashtag Analyzer"
        description="Complete hashtag strategy: broad, medium, niche, and trending tags with explanations. Annual Elite feature."
        badge="Annual"
        checkoutLoading={checkoutLoading}
        onStartCheckout={onStartCheckout}
        requiredPlan="annual"
      />
    );
  }

  async function run() {
    setError("");
    setLoading(true);
    setStrategy(null);
    try {
      const res = await fetch("/api/tools/hashtag-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, platform }),
      });
      const data = (await res.json()) as {
        strategy?: Strategy;
        tokens?: TokenInfo;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Request failed.");
        return;
      }
      setStrategy(data.strategy ?? null);
      onApplyTokenInfo(data.tokens);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const allTags = strategy
    ? [
        ...strategy.broad,
        ...strategy.medium,
        ...strategy.niche,
        ...strategy.trending,
      ].map((t) => t.tag)
    : [];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
      <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Your niche or topic</label>
      <input
        className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
        placeholder="e.g. fitness motivation, food photography"
        value={niche}
        onChange={(e) => setNiche(e.target.value)}
      />

      <div className="mt-4">
        <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Platform</label>
        <select
          className="block min-h-[48px] w-full max-w-md rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          disabled={loading || !niche.trim()}
          onClick={() => void run()}
          className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-amber-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Analyzing…" : "Analyze hashtags"}
        </button>
        <TokenCounter plan={plan} tokensRemaining={tokensRemaining} tokensLimit={tokensLimit} />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {strategy ? (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Your hashtag strategy</p>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-600"
              onClick={async () => {
                await navigator.clipboard.writeText(allTags.join(" "));
              }}
            >
              Copy all hashtags
            </button>
          </div>
          <TagSection title="Broad reach" subtitle="Millions of posts — maximum reach" tags={strategy.broad} />
          <TagSection title="Discovery" subtitle="100k–1M posts — balanced discovery" tags={strategy.medium} />
          <TagSection title="Niche" subtitle="Under 100k — targeted audience" tags={strategy.niche} />
          <TagSection title="Trending" subtitle="Hot right now for your topic" tags={strategy.trending} />
        </div>
      ) : null}
    </div>
  );
}
