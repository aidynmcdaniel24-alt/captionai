"use client";

import { useMemo } from "react";

export type AbWinnerMetric =
  | "likes"
  | "comments"
  | "shares"
  | "profile_visits"
  | "reach";

export type AbExperimentRow = {
  id: string;
  label: string | null;
  variant_a: string;
  variant_b: string;
  picks_a: number | null;
  picks_b: number | null;
  platform: string | null;
  created_at: string;
  style_a: string | null;
  style_b: string | null;
  winner: "a" | "b" | null;
  winner_metric: AbWinnerMetric | null;
  winner_style: string | null;
  winner_recorded_at: string | null;
};

function metricLabel(metric: AbWinnerMetric | null | undefined): string {
  switch (metric) {
    case "likes":
      return "more likes";
    case "comments":
      return "more comments";
    case "shares":
      return "more shares";
    case "profile_visits":
      return "more profile visits";
    case "reach":
      return "higher reach";
    default:
      return "better performance";
  }
}

function metricIcon(metric: AbWinnerMetric | null | undefined): string {
  switch (metric) {
    case "likes":
      return "❤️";
    case "comments":
      return "💬";
    case "shares":
      return "🔁";
    case "profile_visits":
      return "👤";
    case "reach":
      return "📈";
    default:
      return "🏆";
  }
}

type StyleInsight = {
  topStyle: string;
  topWins: number;
  secondStyle: string | null;
  secondWins: number;
  totalWins: number;
};

function computeInsights(rows: AbExperimentRow[]): StyleInsight | null {
  const counts = new Map<string, number>();
  let totalWins = 0;

  for (const r of rows) {
    if (!r.winner) continue;
    const style = r.winner_style?.trim();
    if (!style) continue;
    counts.set(style, (counts.get(style) ?? 0) + 1);
    totalWins += 1;
  }

  if (counts.size === 0 || totalWins === 0) return null;

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return {
    topStyle: sorted[0][0],
    topWins: sorted[0][1],
    secondStyle: sorted[1]?.[0] ?? null,
    secondWins: sorted[1]?.[1] ?? 0,
    totalWins,
  };
}

export function AbPastWinners({
  rows,
  loading,
  loaded,
}: {
  rows: AbExperimentRow[];
  loading: boolean;
  loaded: boolean;
}) {
  const insight = useMemo(() => computeInsights(rows), [rows]);

  if (loading && !loaded) {
    return null;
  }

  if (!loaded) return null;

  if (rows.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 sm:p-6 dark:border-zinc-700 dark:bg-zinc-950/40">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Past winners
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          You haven&apos;t recorded any A/B winners yet. After you publish a pair, come back and mark
          which variant performed better — we&apos;ll surface patterns that work for your audience.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-900/60">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
        Past winners <span className="ml-1 text-zinc-500 dark:text-zinc-400">({rows.length})</span>
      </h3>

      {insight ? (
        <div className="mt-3 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-fuchsia-50 p-4 dark:border-purple-800/60 dark:from-purple-950/40 dark:to-fuchsia-950/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
            Audience insight
          </p>
          <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-white">
            {insight.secondStyle ? (
              <>
                Your audience prefers{" "}
                <span className="text-purple-700 dark:text-purple-300">
                  {insight.topStyle}
                </span>{" "}
                captions over{" "}
                <span className="text-fuchsia-700 dark:text-fuchsia-300">
                  {insight.secondStyle}
                </span>{" "}
                captions.
              </>
            ) : (
              <>
                Your audience consistently prefers{" "}
                <span className="text-purple-700 dark:text-purple-300">
                  {insight.topStyle}
                </span>{" "}
                captions.
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Based on {insight.totalWins} recorded {insight.totalWins === 1 ? "win" : "wins"}
            {insight.secondStyle ? (
              <>
                {" "}— {insight.topStyle} {insight.topWins} vs {insight.secondStyle} {insight.secondWins}.
              </>
            ) : (
              "."
            )}
          </p>
        </div>
      ) : null}

      <ul className="mt-4 flex flex-col gap-3">
        {rows.slice(0, 10).map((row) => {
          const winningStyle = row.winner_style ?? (row.winner === "a" ? row.style_a : row.style_b);
          const losingStyle = row.winner === "a" ? row.style_b : row.style_a;
          const winText = row.winner === "a" ? row.variant_a : row.variant_b;
          return (
            <li
              key={row.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-950/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="truncate">
                  {row.label || "Untitled experiment"}
                  {row.platform ? <> · {row.platform}</> : null}
                </span>
                <span>{new Date(row.winner_recorded_at ?? row.created_at).toLocaleDateString()}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-800 dark:text-zinc-100">
                <span className="font-semibold">
                  Variant {row.winner?.toUpperCase()}
                  {winningStyle ? <> · {winningStyle}</> : null}
                </span>{" "}
                won with{" "}
                <span aria-hidden>{metricIcon(row.winner_metric)}</span>{" "}
                {metricLabel(row.winner_metric)}
                {losingStyle ? (
                  <span className="text-zinc-500 dark:text-zinc-400"> · beat {losingStyle}</span>
                ) : null}
                .
              </p>
              <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                &ldquo;{winText.slice(0, 140)}{winText.length > 140 ? "…" : ""}&rdquo;
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
