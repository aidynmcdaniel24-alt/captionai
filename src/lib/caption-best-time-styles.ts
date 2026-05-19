import type { CaptionRatingKey } from "@/lib/caption-rating-styles";

export const CAPTION_BEST_TIME_BADGE: Record<CaptionRatingKey, string> = {
  best: "border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/40 dark:text-emerald-200",
  medium:
    "border-amber-500/40 bg-amber-50 text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/40 dark:text-amber-200",
  worst: "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400",
};
