"use client";

import { FeatureGate } from "@/components/dashboard/FeatureGate";
import { TokenCounter } from "@/components/dashboard/TokenCounter";
import { isProPlan } from "@/lib/plan";
import { TOKEN_COSTS, type TokenInfo } from "@/lib/tokens-shared";
import { useState } from "react";

const PLATFORMS = [
  "Instagram",
  "TikTok",
  "LinkedIn",
  "Twitter/X",
  "Facebook",
  "YouTube",
  "Pinterest",
  "Threads",
];

const GOALS = [
  { value: "punchier", label: "Make it punchier" },
  { value: "shorter", label: "Make it shorter" },
  { value: "longer", label: "Make it longer" },
  { value: "professional", label: "Make it more professional" },
  { value: "funnier", label: "Make it funnier" },
  { value: "emotional", label: "Make it more emotional" },
  { value: "grammar", label: "Fix the grammar" },
] as const;

type Props = {
  plan: "free" | "pro" | "annual" | null;
  tokensRemaining: number | null;
  tokensLimit: number | null;
  checkoutLoading: boolean;
  onStartCheckout: (interval?: "month" | "year") => void;
  onApplyTokenInfo: (info?: TokenInfo | null) => void;
};

export function RewriterTab({
  plan,
  tokensRemaining,
  tokensLimit,
  checkoutLoading,
  onStartCheckout,
  onApplyTokenInfo,
}: Props) {
  const [mode, setMode] = useState<"rewrite" | "translate">("rewrite");
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [fromPlatform, setFromPlatform] = useState("Instagram");
  const [toPlatform, setToPlatform] = useState("TikTok");
  const [goal, setGoal] = useState("punchier");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [original, setOriginal] = useState("");
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  if (!isProPlan(plan)) {
    return (
      <FeatureGate
        title="Caption Rewriter & Translator"
        description="Paste any caption and rewrite it for your goal, or translate it to sound native on another platform. Pro feature."
        checkoutLoading={checkoutLoading}
        onStartCheckout={onStartCheckout}
        requiredPlan="pro"
      />
    );
  }

  async function run() {
    setError("");
    setLoading(true);
    setOriginal(caption);
    setResult("");
    const cost = mode === "rewrite" ? TOKEN_COSTS.rewrite : TOKEN_COSTS.translate;
    const endpoint = mode === "rewrite" ? "/api/tools/rewrite" : "/api/tools/translate-caption";
    const body =
      mode === "rewrite"
        ? { caption, platform, goal }
        : { caption, fromPlatform, toPlatform };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        rewritten?: string;
        translated?: string;
        original?: string;
        tokens?: TokenInfo;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Request failed.");
        return;
      }
      setOriginal(data.original ?? caption);
      setResult(data.rewritten ?? data.translated ?? "");
      onApplyTokenInfo(data.tokens);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="mb-4 flex gap-2">
        {(["rewrite", "translate"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === m
                ? "bg-purple-600 text-white"
                : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200"
            }`}
          >
            {m === "rewrite" ? "Rewriter" : "Translator"}
          </button>
        ))}
      </div>

      <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Caption</label>
      <textarea
        className="min-h-28 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
        placeholder="Paste your caption here…"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />

      {mode === "rewrite" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Platform</label>
            <select
              className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
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
          <div>
            <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Goal</label>
            <select
              className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            >
              {GOALS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">From platform</label>
            <select
              className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={fromPlatform}
              onChange={(e) => setFromPlatform(e.target.value)}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">To platform</label>
            <select
              className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              value={toPlatform}
              onChange={(e) => setToPlatform(e.target.value)}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          disabled={loading || !caption.trim()}
          onClick={() => void run()}
          className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Working…" : mode === "rewrite" ? "Rewrite caption" : "Translate caption"}
        </button>
        <TokenCounter plan={plan} tokensRemaining={tokensRemaining} tokensLimit={tokensLimit} />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Original</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{original}</p>
          </div>
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-500/30 dark:bg-purple-950/20">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                {mode === "rewrite" ? "Rewritten" : "Translated"}
              </p>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-white dark:border-zinc-600"
                onClick={async () => {
                  await navigator.clipboard.writeText(result);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{result}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
