"use client";

import { FeatureGate } from "@/components/dashboard/FeatureGate";
import { TokenCounter } from "@/components/dashboard/TokenCounter";
import { isAnnualPlan } from "@/lib/plan";
import { TOKEN_COSTS, type TokenInfo } from "@/lib/tokens-shared";
import { useState } from "react";

const PLATFORMS = ["Instagram", "TikTok", "LinkedIn", "Twitter/X", "Facebook", "YouTube"];

type Day = {
  day: string;
  dayLabel: string;
  caption: string;
  bestTime: string;
  hashtags: string;
  hook: string;
};

type Props = {
  plan: "free" | "pro" | "annual" | null;
  tokensRemaining: number | null;
  tokensLimit: number | null;
  checkoutLoading: boolean;
  onStartCheckout: (interval?: "month" | "year") => void;
  onApplyTokenInfo: (info?: TokenInfo | null) => void;
};

function downloadCsv(days: Day[], theme: string) {
  const header = "Day,Label,Hook,Caption,Best Time,Hashtags";
  const rows = days.map((d) =>
    [d.day, d.dayLabel, d.hook, d.caption, d.bestTime, d.hashtags]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `captionai-calendar-${theme.slice(0, 30).replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function CalendarTab({
  plan,
  tokensRemaining,
  tokensLimit,
  checkoutLoading,
  onStartCheckout,
  onApplyTokenInfo,
}: Props) {
  const [theme, setTheme] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("inspirational");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState<Day[]>([]);

  if (!isAnnualPlan(plan)) {
    return (
      <FeatureGate
        title="Caption Calendar"
        description="7 days of captions with hooks, best times, and hashtags — download as CSV. Annual Elite feature."
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
    setDays([]);
    try {
      const res = await fetch("/api/tools/caption-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, platform, tone }),
      });
      const data = (await res.json()) as {
        days?: Day[];
        tokens?: TokenInfo;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Request failed.");
        return;
      }
      setDays(data.days ?? []);
      onApplyTokenInfo(data.tokens);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
      <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">
        Content theme for the week
      </label>
      <input
        className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
        placeholder="e.g. fitness motivation, food photography"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
      />

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
          <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">Tone</label>
          <input
            className="block min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          disabled={loading || !theme.trim()}
          onClick={() => void run()}
          className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-amber-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Building calendar…" : "Generate week"}
        </button>
        <TokenCounter plan={plan} tokensRemaining={tokensRemaining} tokensLimit={tokensLimit} />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {days.length > 0 ? (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Your week</h3>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-600"
              onClick={() => downloadCsv(days, theme)}
            >
              Download CSV
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {days.map((d) => (
              <article
                key={d.day}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950/50"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  {d.day}
                </p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{d.dayLabel}</p>
                <p className="mt-2 text-xs italic text-purple-700 dark:text-purple-300">{d.hook}</p>
                <p className="mt-2 line-clamp-4 text-xs text-zinc-700 dark:text-zinc-300">{d.caption}</p>
                <p className="mt-2 text-[11px] text-zinc-500">
                  <span aria-hidden>⏰ </span>
                  {d.bestTime}
                </p>
                <p className="mt-1 truncate text-[11px] text-purple-600 dark:text-purple-400">{d.hashtags}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
