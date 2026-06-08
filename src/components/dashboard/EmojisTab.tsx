"use client";

import { FeatureGate } from "@/components/dashboard/FeatureGate";
import { TokenCounter } from "@/components/dashboard/TokenCounter";
import { isProPlan } from "@/lib/plan";
import { TOKEN_COSTS, type TokenInfo } from "@/lib/tokens-shared";
import { useState } from "react";

type Suggestion = { emoji: string; explanation: string; placement: string };

type Props = {
  plan: "free" | "pro" | "annual" | null;
  tokensRemaining: number | null;
  tokensLimit: number | null;
  checkoutLoading: boolean;
  onStartCheckout: (interval?: "month" | "year") => void;
  onApplyTokenInfo: (info?: TokenInfo | null) => void;
};

export function EmojisTab({
  plan,
  tokensRemaining,
  tokensLimit,
  checkoutLoading,
  onStartCheckout,
  onApplyTokenInfo,
}: Props) {
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [copiedEmoji, setCopiedEmoji] = useState<string | null>(null);

  if (!isProPlan(plan)) {
    return (
      <FeatureGate
        title="Emoji Suggester"
        description="AI suggests 10 perfect emojis for your caption with explanations and placement tips. Pro feature."
        checkoutLoading={checkoutLoading}
        onStartCheckout={onStartCheckout}
        requiredPlan="pro"
      />
    );
  }

  async function run() {
    setError("");
    setLoading(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/tools/emoji-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      });
      const data = (await res.json()) as {
        suggestions?: Suggestion[];
        tokens?: TokenInfo;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Request failed.");
        return;
      }
      setSuggestions(data.suggestions ?? []);
      onApplyTokenInfo(data.tokens);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Paste or type a caption — AI suggests 10 emojis with where to place each one.
      </p>

      <textarea
        className="min-h-28 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
        placeholder="Your caption…"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          disabled={loading || !caption.trim()}
          onClick={() => void run()}
          className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Suggesting…" : "Suggest emojis"}
        </button>
        <TokenCounter plan={plan} tokensRemaining={tokensRemaining} tokensLimit={tokensLimit} />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {suggestions.map((s) => (
            <button
              key={s.emoji + s.placement}
              type="button"
              title="Click to copy emoji"
              onClick={async () => {
                await navigator.clipboard.writeText(s.emoji);
                setCopiedEmoji(s.emoji);
                setTimeout(() => setCopiedEmoji(null), 1500);
              }}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left transition hover:border-purple-300 hover:bg-purple-50 dark:border-zinc-700 dark:bg-zinc-950/50 dark:hover:border-purple-500/40"
            >
              <span className="text-2xl">{s.emoji}</span>
              {copiedEmoji === s.emoji ? (
                <span className="ml-2 text-xs text-emerald-600">Copied!</span>
              ) : null}
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{s.explanation}</p>
              <p className="mt-1 text-[11px] font-medium text-purple-700 dark:text-purple-300">
                Place: {s.placement}
              </p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
