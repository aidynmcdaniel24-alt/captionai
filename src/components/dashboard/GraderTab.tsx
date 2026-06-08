"use client";

import { FeatureGate } from "@/components/dashboard/FeatureGate";
import { TokenCounter } from "@/components/dashboard/TokenCounter";
import { isAnnualPlan } from "@/lib/plan";
import { TOKEN_COSTS, type TokenInfo } from "@/lib/tokens-shared";
import { useState } from "react";

const PLATFORMS = ["Instagram", "TikTok", "LinkedIn", "Twitter/X", "Facebook", "YouTube"];

type Grade = {
  total: number;
  hook: number;
  emotion: number;
  cta: number;
  platformFit: number;
  originality: number;
  tips: Record<string, string>;
  improved: string;
};

type Competitor = {
  hookTechnique: string;
  emotionalTriggers: string[];
  ctaType: string;
  hashtagStrategy: string;
  whatWorks: string;
  whatDoesnt: string;
  howToBeatIt: string;
};

type Props = {
  plan: "free" | "pro" | "annual" | null;
  tokensRemaining: number | null;
  tokensLimit: number | null;
  checkoutLoading: boolean;
  onStartCheckout: (interval?: "month" | "year") => void;
  onApplyTokenInfo: (info?: TokenInfo | null) => void;
};

export function GraderTab({
  plan,
  tokensRemaining,
  tokensLimit,
  checkoutLoading,
  onStartCheckout,
  onApplyTokenInfo,
}: Props) {
  const [mode, setMode] = useState<"grade" | "competitor">("grade");
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);
  const [competitor, setCompetitor] = useState<Competitor | null>(null);

  if (!isAnnualPlan(plan)) {
    return (
      <FeatureGate
        title="Caption Grader & Competitor Analyzer"
        description="Grade any caption out of 100 with a breakdown and improved rewrite, or analyze what makes a competitor's caption work. Annual Elite feature."
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
    setGrade(null);
    setCompetitor(null);
    const endpoint =
      mode === "grade" ? "/api/tools/grade-caption" : "/api/tools/competitor-analyze";
    const cost = mode === "grade" ? TOKEN_COSTS.grade : TOKEN_COSTS.competitor;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, platform }),
      });
      const data = (await res.json()) as {
        grade?: Grade;
        analysis?: Competitor;
        tokens?: TokenInfo;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Request failed.");
        return;
      }
      if (mode === "grade") setGrade(data.grade ?? null);
      else setCompetitor(data.analysis ?? null);
      onApplyTokenInfo(data.tokens);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const dimensions =
    grade &&
    ([
      ["Hook strength", grade.hook, 25, grade.tips.hook],
      ["Emotional engagement", grade.emotion, 25, grade.tips.emotion],
      ["Call to action", grade.cta, 20, grade.tips.cta],
      ["Platform fit", grade.platformFit, 20, grade.tips.platformFit],
      ["Originality", grade.originality, 10, grade.tips.originality],
    ] as const);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="mb-4 flex gap-2">
        {(["grade", "competitor"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === m
                ? "bg-amber-600 text-white"
                : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200"
            }`}
          >
            {m === "grade" ? "Grader" : "Competitor"}
          </button>
        ))}
      </div>

      <textarea
        className="min-h-28 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
        placeholder={
          mode === "grade"
            ? "Paste your caption (or someone else's)…"
            : "Paste a competitor's caption…"
        }
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
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
          disabled={loading || !caption.trim()}
          onClick={() => void run()}
          className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-amber-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Analyzing…" : mode === "grade" ? "Grade caption" : "Analyze competitor"}
        </button>
        <TokenCounter plan={plan} tokensRemaining={tokensRemaining} tokensLimit={tokensLimit} />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {grade ? (
        <div className="mt-6 space-y-4">
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">
            {grade.total}
            <span className="text-lg font-normal text-zinc-500"> / 100</span>
          </p>
          {dimensions?.map(([label, score, max, tip]) => (
            <div key={label}>
              <div className="flex justify-between text-sm">
                <span>{label}</span>
                <span className="font-mono">
                  {score}/{max}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${Math.min(100, (score / max) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{tip}</p>
            </div>
          ))}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/30">
            <p className="text-xs font-semibold uppercase text-emerald-800 dark:text-emerald-200">
              Improved caption
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
              {grade.improved}
            </p>
            <button
              type="button"
              className="mt-3 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium"
              onClick={() => void navigator.clipboard.writeText(grade.improved)}
            >
              Copy improved
            </button>
          </div>
        </div>
      ) : null}

      {competitor ? (
        <dl className="mt-6 space-y-3 text-sm">
          {(
            [
              ["Hook technique", competitor.hookTechnique],
              ["CTA type", competitor.ctaType],
              ["Hashtag strategy", competitor.hashtagStrategy],
              ["What works", competitor.whatWorks],
              ["What doesn't", competitor.whatDoesnt],
              ["How to beat it", competitor.howToBeatIt],
            ] as const
          ).map(([dt, dd]) => (
            <div key={dt}>
              <dt className="text-xs font-semibold uppercase text-zinc-500">{dt}</dt>
              <dd className="mt-1 text-zinc-800 dark:text-zinc-200">{dd}</dd>
            </div>
          ))}
          {competitor.emotionalTriggers.length > 0 ? (
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500">Emotional triggers</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {competitor.emotionalTriggers.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                  >
                    {t}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
