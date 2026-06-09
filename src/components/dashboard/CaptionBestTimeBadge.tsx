"use client";

import { CAPTION_BEST_TIME_BADGE } from "@/lib/caption-best-time-styles";
import type { BestTimeRecommendation } from "@/lib/best-time-recommendations";
import { formatBestTimeTooltip } from "@/lib/best-time-recommendations";
import type { CaptionRatingKey } from "@/lib/caption-rating-styles";

type CaptionBestTimeBadgeProps = {
  time?: string | null;
  recommendation?: BestTimeRecommendation | null;
  rating: CaptionRatingKey;
  loading?: boolean;
  /** Legacy fallback reason when recommendation object is unavailable. */
  reason?: string | null;
};

const CONFIDENCE_STYLES: Record<string, string> = {
  High: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  Low: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function CaptionBestTimeBadge({
  time,
  recommendation,
  rating,
  loading,
  reason,
}: CaptionBestTimeBadgeProps) {
  if (loading) {
    return (
      <p
        className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium animate-pulse ${CAPTION_BEST_TIME_BADGE[rating]}`}
      >
        <span aria-hidden>⏰</span>
        Finding best time…
      </p>
    );
  }

  const rec = recommendation ?? (time ? { time, reason: reason ?? "", stat: "", confidence: "Medium" as const } : null);
  if (!rec?.time) {
    return null;
  }

  const tooltip = recommendation
    ? formatBestTimeTooltip(recommendation)
    : reason ?? rec.time;
  const confidence = recommendation?.confidence ?? "Medium";

  return (
    <div className="mt-3 max-w-lg">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${CAPTION_BEST_TIME_BADGE[rating]}`}
          title={tooltip}
        >
          <span aria-hidden>📊</span>
          <span>
            Best time:{" "}
            <span className="font-semibold">
              {rec.time.split(" or ")[0]?.split(" · ")[0] ?? rec.time}
            </span>
          </span>
        </span>
        {recommendation ? (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CONFIDENCE_STYLES[confidence] ?? CONFIDENCE_STYLES.Medium}`}
          >
            {confidence}
          </span>
        ) : null}
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300 text-[10px] font-bold text-zinc-500 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
          title={tooltip}
          aria-label="Why this posting time"
        >
          i
        </button>
      </div>
      {recommendation ? (
        <p className="mt-1.5 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
          {recommendation.reason}
          {recommendation.stat ? (
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {" "}
              {recommendation.stat}
            </span>
          ) : null}
        </p>
      ) : reason ? (
        <span className="mt-1 block max-w-md text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
          {reason}
        </span>
      ) : null}
    </div>
  );
}
