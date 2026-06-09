"use client";

import { isProPlan } from "@/lib/plan";
import { useCallback, useEffect, useState } from "react";

type CountedItem = { name: string; value: number };
type CopiedItem = {
  caption: string;
  platform: string;
  tone: string;
  favoriteCount: number;
};

type BestCaption = {
  caption: string;
  score: number | null;
  platform: string;
  tone: string;
};

type WeekComparison = {
  thisWeek: number;
  lastWeek: number;
  deltaPercent: number;
  direction: "up" | "down" | "flat";
};

type AnalyticsResponse = {
  plan: "free" | "pro" | "annual";
  proRequired?: boolean;
  total: number;
  thisWeek: number;
  lastWeek: number;
  platforms: CountedItem[];
  tones: CountedItem[];
  languages: CountedItem[];
  topCopied: CopiedItem[];
  bestHourLabel: string | null;
  favoritesCount: number;
  copiesCount?: number;
  mostUsedPlatform?: string | null;
  favoriteTone?: string | null;
  topTopics?: string[];
  insights?: string[];
  streak?: number;
  bestCaption?: BestCaption | null;
  weekComparison?: WeekComparison;
};

type Props = {
  plan: "free" | "pro" | "annual" | null;
  checkoutLoading: boolean;
  onStartCheckout: (interval?: "month" | "year") => void;
};

const BAR_COLORS = [
  "from-purple-500 to-fuchsia-500",
  "from-violet-500 to-purple-500",
  "from-indigo-500 to-violet-500",
  "from-blue-500 to-indigo-500",
  "from-cyan-500 to-blue-500",
  "from-teal-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
];

const PLACEHOLDER: AnalyticsResponse = {
  plan: "free",
  proRequired: true,
  total: 247,
  thisWeek: 18,
  lastWeek: 12,
  platforms: [
    { name: "Instagram", value: 92 },
    { name: "TikTok", value: 64 },
    { name: "LinkedIn", value: 41 },
    { name: "Twitter/X", value: 28 },
    { name: "Facebook", value: 22 },
  ],
  tones: [
    { name: "Inspirational", value: 78 },
    { name: "Funny", value: 56 },
    { name: "Professional", value: 42 },
    { name: "Hype", value: 38 },
    { name: "Casual", value: 33 },
  ],
  languages: [
    { name: "English", value: 220 },
    { name: "Spanish", value: 18 },
    { name: "French", value: 9 },
  ],
  topCopied: [
    {
      caption: "Three months in and this still doesn't feel real…",
      platform: "Instagram",
      tone: "Inspirational",
      favoriteCount: 14,
    },
    {
      caption: "POV: you found the fastest way to write captions",
      platform: "TikTok",
      tone: "Hype",
      favoriteCount: 11,
    },
    {
      caption: "Most operators get this backwards.",
      platform: "LinkedIn",
      tone: "Professional",
      favoriteCount: 9,
    },
  ],
  bestHourLabel: "19:00 UTC",
  favoritesCount: 42,
  insights: [
    "You generate most captions on Tuesday — consider scheduling your posts for then.",
    "Instagram is your most used platform — you might want to try LinkedIn too.",
    "Your captions score highest with a hype tone — keep using it!",
  ],
  streak: 5,
  bestCaption: {
    caption: "Three months in and this still doesn't feel real…",
    score: 87,
    platform: "Instagram",
    tone: "Inspirational",
  },
  weekComparison: {
    thisWeek: 18,
    lastWeek: 12,
    deltaPercent: 50,
    direction: "up",
  },
};

function BarRow({
  item,
  max,
  colorIndex,
}: {
  item: CountedItem;
  max: number;
  colorIndex: number;
}) {
  const pct = max === 0 ? 0 : Math.max(4, Math.round((item.value / max) * 100));
  const gradient = BAR_COLORS[colorIndex % BAR_COLORS.length];
  return (
    <div className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2 text-sm">
      <span
        className="truncate font-medium text-zinc-700 dark:text-zinc-200"
        title={item.name}
      >
        {item.name}
      </span>
      <div className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={item.value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`${item.name}: ${item.value}`}
        />
      </div>
      <span className="text-right font-mono text-xs tabular-nums font-semibold text-zinc-600 dark:text-zinc-300">
        {item.value}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "purple" | "emerald" | "amber" | "blue";
}) {
  const accentBorder = {
    purple: "border-purple-200 dark:border-purple-800/50",
    emerald: "border-emerald-200 dark:border-emerald-800/50",
    amber: "border-amber-200 dark:border-amber-800/50",
    blue: "border-blue-200 dark:border-blue-800/50",
  }[accent ?? "purple"];

  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900/80 ${accentBorder}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900 sm:text-3xl dark:text-white">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}

function WeekComparisonCard({ comparison }: { comparison: WeekComparison }) {
  const { thisWeek, lastWeek, deltaPercent, direction } = comparison;
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  const color =
    direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : direction === "down"
        ? "text-red-600 dark:text-red-400"
        : "text-zinc-500";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-4 shadow-sm dark:border-zinc-800 dark:from-zinc-900/80 dark:to-zinc-950/60">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        This week vs last week
      </p>
      <div className="mt-3 flex items-end gap-4">
        <div>
          <p className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">
            {thisWeek}
          </p>
          <p className="text-xs text-zinc-500">This week</p>
        </div>
        <div className={`text-2xl font-bold ${color}`} aria-hidden>
          {arrow}
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">
            {lastWeek}
          </p>
          <p className="text-xs text-zinc-500">Last week</p>
        </div>
        <div className={`ml-auto text-right text-sm font-semibold ${color}`}>
          {direction === "flat" ? "No change" : `${deltaPercent >= 0 ? "+" : ""}${deltaPercent}%`}
        </div>
      </div>
    </div>
  );
}

function AnalyticsView({ data, blurred }: { data: AnalyticsResponse; blurred: boolean }) {
  const platformMax = data.platforms[0]?.value ?? 0;
  const toneMax = data.tones[0]?.value ?? 0;
  const languageMax = data.languages[0]?.value ?? 0;
  const insights = data.insights ?? [];
  const streak = data.streak ?? 0;
  const weekComparison = data.weekComparison ?? {
    thisWeek: data.thisWeek,
    lastWeek: data.lastWeek,
    deltaPercent: 0,
    direction: "flat" as const,
  };

  return (
    <div className={blurred ? "select-none blur-sm pointer-events-none" : ""} aria-hidden={blurred}>
      {insights.length > 0 ? (
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-fuchsia-50 p-5 dark:border-purple-800/40 dark:from-purple-950/30 dark:to-fuchsia-950/20">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              💡
            </span>
            <h3 className="text-sm font-bold text-purple-900 dark:text-purple-100">
              Your insights
            </h3>
          </div>
          <ul className="mt-3 space-y-2">
            {insights.map((insight, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm leading-relaxed text-purple-900/90 dark:text-purple-100/90"
              >
                <span className="mt-0.5 shrink-0 text-purple-500" aria-hidden>
                  •
                </span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total captions" value={data.total} hint="All time" accent="purple" />
        <StatCard
          label="Day streak"
          value={streak > 0 ? `🔥 ${streak}` : "—"}
          hint={streak > 0 ? "Days in a row" : "Generate daily to build a streak"}
          accent="amber"
        />
        <StatCard
          label="Captions copied"
          value={data.copiesCount ?? data.favoritesCount}
          hint="Your best picks"
          accent="emerald"
        />
        <StatCard
          label="Peak hour"
          value={data.bestHourLabel ?? "—"}
          hint="When you create most"
          accent="blue"
        />
      </div>

      <div className="mt-4">
        <WeekComparisonCard comparison={weekComparison} />
      </div>

      {data.bestCaption ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 dark:border-amber-800/40 dark:from-amber-950/25 dark:to-yellow-950/20">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              🏆
            </span>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
              Your best caption
            </h3>
            {data.bestCaption.score != null ? (
              <span className="ml-auto rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                Score {data.bestCaption.score}
              </span>
            ) : (
              <span className="ml-auto rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                AI Best pick
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-amber-950 dark:text-amber-50">
            &ldquo;{data.bestCaption.caption}&rdquo;
          </p>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            {data.bestCaption.platform} · {data.bestCaption.tone}
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Most used platforms
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            {data.platforms.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Generate your first caption to see which platforms you prefer.
              </p>
            ) : (
              data.platforms.map((p, i) => (
                <BarRow key={p.name} item={p} max={platformMax} colorIndex={i} />
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Most used tones
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            {data.tones.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Try different tones — we&apos;ll show which ones you love most.
              </p>
            ) : (
              data.tones.map((p, i) => (
                <BarRow key={p.name} item={p} max={toneMax} colorIndex={i + 2} />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Language breakdown
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            {data.languages.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Generate captions in different languages to see your mix here.
              </p>
            ) : (
              data.languages.map((p, i) => (
                <BarRow key={p.name} item={p} max={languageMax} colorIndex={i + 4} />
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Top performing captions
          </h3>
          <ol className="mt-3 flex flex-col gap-3">
            {data.topCopied.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Copy captions you love — we&apos;ll track which ones perform best for you.
              </p>
            ) : (
              data.topCopied.map((c, idx) => (
                <li
                  key={`${idx}-${c.caption.slice(0, 16)}`}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/40"
                >
                  <p className="line-clamp-3 text-zinc-800 dark:text-zinc-100">
                    {c.caption}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {c.platform} · {c.tone} · copied {c.favoriteCount}×
                  </p>
                </li>
              ))
            )}
          </ol>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsTab({ plan, checkoutLoading, onStartCheckout }: Props) {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/captions");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Could not load analytics.");
        return;
      }
      setData((await res.json()) as AnalyticsResponse);
    } catch {
      setError("Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time fetch
    void load();
  }, [load]);

  const isFree = !isProPlan(plan);
  const empty = data && !data.proRequired && data.total === 0;

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80">
        Loading your personal analytics…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        role="alert"
      >
        {error}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Your Caption Coach
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Personalized insights on your habits, streaks, and what&apos;s working — not just
          numbers.
        </p>
      </div>

      {isFree ? (
        <div className="relative">
          <AnalyticsView data={PLACEHOLDER} blurred />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/70 px-4 py-8 text-center backdrop-blur-md dark:bg-zinc-950/70">
            <span className="rounded-full border border-purple-300 bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-purple-800 dark:border-purple-500/40 dark:bg-purple-950/40 dark:text-purple-200">
              Pro feature
            </span>
            <h3 className="max-w-md text-xl font-bold text-zinc-900 sm:text-2xl dark:text-white">
              Upgrade to Pro to unlock your caption coach
            </h3>
            <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-300">
              Get personalized insights, streak tracking, week-over-week trends, and your
              highest-scoring captions.
            </p>
            <button
              type="button"
              disabled={checkoutLoading}
              onClick={() => onStartCheckout("month")}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition hover:from-purple-400 hover:to-fuchsia-400 disabled:opacity-60"
            >
              {checkoutLoading ? "Opening Stripe…" : "Upgrade to Pro — $9/month"}
            </button>
          </div>
        </div>
      ) : empty ? (
        <div className="rounded-2xl border border-dashed border-purple-300 bg-gradient-to-br from-purple-50/50 to-fuchsia-50/50 p-10 text-center dark:border-purple-700/50 dark:from-purple-950/20 dark:to-fuchsia-950/20">
          <p className="text-4xl">📊</p>
          <h3 className="mt-4 text-xl font-bold text-zinc-900 dark:text-white">
            Your coach is ready — let&apos;s get started
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            Generate your first caption to see personalized insights, streak tracking, and
            week-over-week trends. The more you create, the smarter your coach gets.
          </p>
        </div>
      ) : data ? (
        <AnalyticsView data={data} blurred={false} />
      ) : null}
    </div>
  );
}
