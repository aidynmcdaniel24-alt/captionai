"use client";

import { useCallback, useEffect, useState } from "react";

type HistoryRow = {
  id: string;
  topic: string;
  platform: string;
  tone: string;
  language?: string;
  captions: string[];
  created_at: string;
  favoriteIndexes?: number[];
  ratings?: Record<string, "worst" | "medium" | "best">;
};

export function CaptionHistorySection({ refreshKey }: { refreshKey?: number }) {
  const [items, setItems] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/captions/history");
      const data = (await res.json()) as { items?: HistoryRow[]; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not load history.");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setError("Could not load history.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/captions/history?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        return;
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch {
      /* ignore */
    }
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  }

  async function toggleFavorite(historyId: string, captionIndex: number, isFav: boolean) {
    await fetch("/api/captions/favorite", {
      method: isFav ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId, captionIndex }),
    });
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== historyId) {
          return row;
        }
        const set = new Set(row.favoriteIndexes ?? []);
        if (isFav) {
          set.add(captionIndex);
        } else {
          set.delete(captionIndex);
        }
        return { ...row, favoriteIndexes: Array.from(set) };
      })
    );
  }

  async function rateCaption(
    historyId: string,
    captionIndex: number,
    rating: "worst" | "medium" | "best"
  ) {
    await fetch("/api/captions/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId, captionIndex, rating }),
    });
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== historyId) {
          return row;
        }
        const ratings = { ...(row.ratings ?? {}), [String(captionIndex)]: rating };
        return { ...row, ratings };
      })
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
        Loading caption history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-amber-800 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-amber-200/90">
        {error}{" "}
        <span className="text-zinc-500">
          (Run the caption_history and features_restore SQL in Supabase if tables are missing.)
        </span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
        No saved captions yet. Generate captions above — your last 10 batches appear here.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
      <h2 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-white">Recent caption history</h2>
      <p className="mb-4 text-sm text-zinc-500">
        Last 10 generations. Copy any line, rate, favorite, or delete a batch.
      </p>
      <ul className="space-y-6">
        {items.map((row) => (
          <li key={row.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/80">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.topic}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {row.platform} · {row.tone}
                  {row.language ? ` · ${row.language}` : ""} ·{" "}
                  {new Date(row.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40"
                onClick={() => remove(row.id)}
              >
                Delete batch
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {row.captions.map((cap, i) => {
                const key = `${row.id}-${i}`;
                const isFav = row.favoriteIndexes?.includes(i);
                const r = row.ratings?.[String(i)];
                return (
                  <li
                    key={key}
                    className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="leading-relaxed">{cap}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          className="text-lg text-zinc-500 hover:text-amber-500 dark:text-zinc-400"
                          title="Favorite"
                          onClick={() => toggleFavorite(row.id, i, !isFav)}
                          aria-label={isFav ? "Remove favorite" : "Favorite"}
                        >
                          {isFav ? "★" : "☆"}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                          onClick={() => copyText(cap, key)}
                        >
                          {copied === key ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500">{cap.length} characters</p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["worst", "Worst"],
                          ["medium", "Medium"],
                          ["best", "Best"],
                        ] as const
                      ).map(([k, label]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => rateCaption(row.id, i, k)}
                          className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${
                            r === k
                              ? k === "worst"
                                ? "border-red-600 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/50 dark:text-red-300"
                                : k === "medium"
                                  ? "border-amber-500 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-200"
                                  : "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200"
                              : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
