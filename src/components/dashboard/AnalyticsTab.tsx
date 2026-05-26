"use client";

import { useCallback, useEffect, useState } from "react";

type CountedItem = { name: string; value: number };
type CopiedItem = {
  caption: string;
  platform: string;
  tone: string;
  favoriteCount: number;
};

type AnalyticsResponse = {
  plan: "free" | "pro";
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
};

type Props = {
  plan: "free" | "pro" | null;
  checkoutLoading: boolean;
  onStartCheckout: (interval?: "month" | "year") => void;
};

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
};

function deltaLabel(thisWeek: number, lastWeek: number): {
  label: string;
  positive: boolean;
} {
  if (lastWeek === 0 && thisWeek === 0) return { label: "no change", positive: true };
  if (lastWeek === 0) return { label: "+100%", positive: true };
  const pct = ((thisWeek - lastWeek) / Math.max(1, lastWeek)) * 100;
  const rounded = Math.round(pct);
  return {
    label: `${rounded >= 0 ? "+" : ""}${rounded}%`,
    positive: rounded >= 0,
  };
}

function BarRow({ item, max }: { item: CountedItem; max: number }) {
  const pct = max === 0 ? 0 : Math.max(2, Math.round((item.value / max) * 100));
  return (
    <div className="grid grid-cols-[8rem_1fr_3rem] items-center gap-2 text-sm">
      <span className="truncate font-medium text-zinc-700 dark:text-zinc-200">
        {item.name}
      </span>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-right font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
        {item.value}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
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

function AnalyticsView({ data, blurred }: { data: AnalyticsResponse; blurred: boolean }) {
  const platformMax = data.platforms[0]?.value ?? 0;
  const toneMax = data.tones[0]?.value ?? 0;
  const languageMax = data.languages[0]?.value ?? 0;
  const delta = deltaLabel(data.thisWeek, data.lastWeek);

  return (
    <div className={blurred ? "select-none blur-sm pointer-events-none" : ""} aria-hidden={blurred}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total captions" value={data.total} hint="All time" />
        <StatCard
          label="This week"
          value={data.thisWeek}
          hint={`${delta.label} vs last week`}
        />
        <StatCard
          label="Favorites"
          value={data.favoritesCount}
          hint="Captions you starred"
        />
        <StatCard
          label="Best hour"
          value={data.bestHourLabel ?? "—"}
          hint="When you create most"
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Most used platforms
          </h3>
          <div className="mt-3 flex flex-col gap-2.5">
            {data.platforms.length === 0 ? (
              <p className="text-sm text-zinc-500">No data yet</p>
            ) : (
              data.platforms.map((p) => (
                <BarRow key={p.name} item={p} max={platformMax} />
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Most used tones
          </h3>
          <div className="mt-3 flex flex-col gap-2.5">
            {data.tones.length === 0 ? (
              <p className="text-sm text-zinc-500">No data yet</p>
            ) : (
              data.tones.map((p) => <BarRow key={p.name} item={p} max={toneMax} />)
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Language breakdown
          </h3>
          <div className="mt-3 flex flex-col gap-2.5">
            {data.languages.length === 0 ? (
              <p className="text-sm text-zinc-500">No data yet</p>
            ) : (
              data.languages.map((p) => (
                <BarRow key={p.name} item={p} max={languageMax} />
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
              <p className="text-sm text-zinc-500">No data yet</p>
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
                    {c.platform} · {c.tone} · ⭐ {c.favoriteCount}
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

  const isFree = plan !== "pro";
  const empty =
    data && !data.proRequired && data.total === 0;

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80">
        Loading analytics…
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
          Caption Analytics
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Where your captions are landing — platforms, tones, language, and the
          ones you actually save.
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
              Upgrade to Pro to see your analytics
            </h3>
            <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-300">
              Track which platforms, tones, and times of day are working best
              for you. See the captions you save the most.
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
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/80">
          <p className="text-3xl">📊</p>
          <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-white">
            No data yet
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Generate a few captions and your analytics will start showing up
            here.
          </p>
        </div>
      ) : data ? (
        <AnalyticsView data={data} blurred={false} />
      ) : null}
    </div>
  );
}
