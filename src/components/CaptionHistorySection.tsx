"use client";

import { useCallback, useEffect, useState } from "react";

type HistoryRow = {
  id: string;
  topic: string;
  platform: string;
  tone: string;
  captions: string[];
  created_at: string;
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

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-500">
        Loading caption history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-amber-200/90">
        {error}{" "}
        <span className="text-zinc-500">
          (Run the caption_history SQL in Supabase if you have not created the table yet.)
        </span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-500">
        No saved captions yet. Generate captions above — your last 10 batches appear here.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
      <h2 className="mb-1 text-xl font-semibold">Recent caption history</h2>
      <p className="mb-4 text-sm text-zinc-500">Last 10 generations. Copy any line or delete a batch you don’t need.</p>
      <ul className="space-y-6">
        {items.map((row) => (
          <li key={row.id} className="rounded-xl border border-zinc-700 bg-zinc-950/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-zinc-100">{row.topic}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {row.platform} · {row.tone} ·{" "}
                  {new Date(row.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-red-900/50 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/40"
                onClick={() => remove(row.id)}
              >
                Delete batch
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {row.captions.map((cap, i) => {
                const key = `${row.id}-${i}`;
                return (
                  <li
                    key={key}
                    className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-200"
                  >
                    <span className="leading-relaxed">{cap}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800"
                      onClick={() => copyText(cap, key)}
                    >
                      {copied === key ? "Copied" : "Copy"}
                    </button>
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
