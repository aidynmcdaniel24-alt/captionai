"use client";

import { CAPTION_BEST_TIME_BADGE } from "@/lib/caption-best-time-styles";
import type { CaptionRatingKey } from "@/lib/caption-rating-styles";

type CaptionBestTimeBadgeProps = {
  time: string | null | undefined;
  rating: CaptionRatingKey;
  loading?: boolean;
};

export function CaptionBestTimeBadge({ time, rating, loading }: CaptionBestTimeBadgeProps) {
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

  if (!time) {
    return null;
  }

  return (
    <p
      className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${CAPTION_BEST_TIME_BADGE[rating]}`}
    >
      <span aria-hidden>⏰</span>
      <span>
        Best time: <span className="font-semibold">{time}</span>
      </span>
    </p>
  );
}
