"use client";

import { CaptionActions } from "@/components/dashboard/CaptionActions";
import { CaptionBestTimeBadge } from "@/components/dashboard/CaptionBestTimeBadge";
import { useCaptionBestTimes } from "@/components/dashboard/useCaptionBestTimes";
import {
  CAPTION_RATING_ACTIVE,
  CAPTION_RATING_LABELS,
  type CaptionRatingKey,
} from "@/lib/caption-rating-styles";
import { useCallback, useEffect, useState } from "react";

type HistoryItem = {
  id: string;
  topic: string;
  platform: string;
  tone: string;
  captions: string[];
  created_at: string;
  ratings?: Record<string, CaptionRatingKey>;
};

function ratingFor(item: HistoryItem, index: number): CaptionRatingKey {
  return item.ratings?.[String(index)] ?? "medium";
}

function HistoryEntry({ item, plan }: { item: HistoryItem; plan: "free" | "pro" | null }) {
  const [open, setOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const ratings = item.captions.map((_, i) => ratingFor(item, i));

  const { times, loading: timesLoading } = useCaptionBestTimes({
    captions: open ? item.captions : [],
    ratings,
    platform: item.platform,
    tone: item.tone,
    topic: item.topic,
    enabled: open && item.captions.length > 0,
  });

  function isBestLockedForFree(index: number) {
    return plan !== "pro" && ratings[index] === "best";
  }

  async function handleCopy(caption: string, index: number) {
    if (isBestLockedForFree(index)) {
      return;
    }
    await navigator.clipboard.writeText(caption);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  const dateLabel = new Date(item.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <article className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{item.topic || "Untitled"}</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {item.platform} · {item.tone} · {dateLabel}
          </p>
        </div>
        <span className="shrink-0 text-sm text-zinc-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <ul className="space-y-3 border-t border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
          {item.captions.map((caption, index) => {
            const locked = isBestLockedForFree(index);
            const rating = ratings[index] ?? "medium";
            return (
              <li
                key={`${item.id}-${index}`}
                className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/60"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-medium ${CAPTION_RATING_ACTIVE[rating]}`}
                  >
                    {CAPTION_RATING_LABELS[rating]}
                  </span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 ${locked ? "select-none blur-sm" : ""}`}
                    >
                      {caption}
                    </p>
                    {!locked ? (
                      <CaptionBestTimeBadge time={times[index]} rating={rating} loading={timesLoading} />
                    ) : null}
                  </div>
                  <CaptionActions
                    caption={caption}
                    copyLabel={copiedIndex === index ? "Copied!" : "Copy"}
                    disabled={locked}
                    onCopy={() => handleCopy(caption, index)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </article>
  );
}

export function CaptionHistorySection({ plan }: { plan: "free" | "pro" | null }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/captions/history");
      const data = (await res.json()) as { items?: HistoryItem[] };
      if (res.ok && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Caption history</h2>
        <p className="mt-2 animate-pulse text-sm text-zinc-500">Loading history…</p>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Caption history</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Copy or schedule past captions with Buffer.
      </p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <HistoryEntry key={item.id} item={item} plan={plan} />
        ))}
      </div>
    </section>
  );
}
