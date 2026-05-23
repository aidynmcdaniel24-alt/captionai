"use client";

import {
  bandForScore,
  colorClassesForBand,
  type CaptionScore,
} from "@/lib/caption-score";

type CaptionScoreBarProps = {
  score: CaptionScore;
};

export function CaptionScoreBar({ score }: CaptionScoreBarProps) {
  const band = score.band ?? bandForScore(score.total);
  const colors = colorClassesForBand(band);
  const pct = Math.max(0, Math.min(100, score.total));

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Caption score
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${colors.chip}`}
          aria-label={`Score ${score.total} out of 100`}
        >
          {score.total} / 100
        </span>
      </div>
      <div
        className={`mt-1.5 h-2 w-full overflow-hidden rounded-full ${colors.track}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score.total}
      >
        <div
          className={`h-full rounded-full transition-all ${colors.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {score.explanation ? (
        <p className={`mt-1.5 text-xs ${colors.text}`}>{score.explanation}</p>
      ) : null}
    </div>
  );
}
