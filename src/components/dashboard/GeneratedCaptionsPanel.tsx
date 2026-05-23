"use client";

import { CaptionActions } from "@/components/dashboard/CaptionActions";
import { CaptionBestTimeBadge } from "@/components/dashboard/CaptionBestTimeBadge";
import { CaptionScoreBar } from "@/components/dashboard/CaptionScoreBar";
import { useCaptionBestTimes } from "@/components/dashboard/useCaptionBestTimes";
import type { CaptionScore } from "@/lib/caption-score";
import {
  CAPTION_RATING_ACTIVE,
  CAPTION_RATING_LABELS,
  type CaptionRatingKey,
} from "@/lib/caption-rating-styles";

type GeneratedCaptionsPanelProps = {
  captions: string[];
  captionRatings: CaptionRatingKey[];
  captionScores?: CaptionScore[];
  emojiPerCaption: string[][];
  historyId: string | null;
  platform: string;
  tone: string;
  topic: string;
  plan: "free" | "pro" | null;
  proBoost?: boolean;
  brandVoiceActive?: boolean;
  copiedIndex: number | null;
  fav: Record<number, boolean>;
  checkoutLoading: boolean;
  onCopy: (caption: string, index: number) => void;
  onToggleFavorite: (index: number) => void;
  onStartCheckout: (interval?: "month" | "year") => void;
  onCopyAll: () => void;
  onDownloadTxt: () => void;
};

export function GeneratedCaptionsPanel({
  captions,
  captionRatings,
  captionScores,
  emojiPerCaption,
  historyId,
  platform,
  tone,
  topic,
  plan,
  proBoost,
  brandVoiceActive,
  copiedIndex,
  fav,
  checkoutLoading,
  onCopy,
  onToggleFavorite,
  onStartCheckout,
  onCopyAll,
  onDownloadTxt,
}: GeneratedCaptionsPanelProps) {
  const displayPlatform = platform.trim() || "Instagram";
  const ratingsForTimes = captions.map((_, i) => captionRatings[i] ?? ("medium" as const));

  const { times, loading: timesLoading } = useCaptionBestTimes({
    captions,
    ratings: ratingsForTimes,
    platform: displayPlatform,
    tone,
    topic,
    enabled: captions.length > 0,
  });

  function isBestLockedForFree(index: number) {
    return plan !== "pro" && captionRatings[index] === "best";
  }

  const isProBoost = Boolean(proBoost);
  const showProUpsell = plan === "free" && !isProBoost;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl dark:text-white">
            Your captions
          </h2>
          {isProBoost ? (
            <span
              title="Generated with the Pro AI caption boost — viral hooks, deeper storytelling, advanced copywriting."
              className="inline-flex items-center gap-1 rounded-full border border-purple-400/70 bg-gradient-to-r from-purple-100 to-fuchsia-100 px-2.5 py-1 text-xs font-semibold text-purple-800 shadow-sm dark:border-purple-500/50 dark:from-purple-950/60 dark:to-fuchsia-950/60 dark:text-purple-200"
            >
              <span aria-hidden>✨</span>
              Pro captions
            </span>
          ) : null}
          {brandVoiceActive ? (
            <span
              title="Generated using your saved Brand Voice — words, personality, and example caption applied."
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              <span aria-hidden>●</span>
              Brand Voice active
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-50 sm:flex-none dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            onClick={onCopyAll}
          >
            Copy all
          </button>
          <button
            type="button"
            className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-50 sm:flex-none dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            onClick={onDownloadTxt}
          >
            Download .txt
          </button>
        </div>
      </div>

      {showProUpsell ? (
        <button
          type="button"
          onClick={() => onStartCheckout("month")}
          disabled={checkoutLoading}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl border border-purple-300/70 bg-gradient-to-r from-purple-50 to-fuchsia-50 px-4 py-2.5 text-left text-sm transition hover:from-purple-100 hover:to-fuchsia-100 disabled:opacity-60 dark:border-purple-500/30 dark:from-purple-950/40 dark:to-fuchsia-950/40 dark:hover:from-purple-950/60 dark:hover:to-fuchsia-950/60"
        >
          <span className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
            <span aria-hidden>✨</span>
            <span>
              <span className="font-semibold">Upgrade to Pro</span> for AI-boosted viral captions
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white">
            Try Pro
          </span>
        </button>
      ) : null}
      <ul className="space-y-4">
        {captions.map((caption, index) => {
          const locked = isBestLockedForFree(index);
          const rating = captionRatings[index] ?? "medium";

          return (
            <li
              key={historyId ? `${historyId}-${index}` : `cap-${index}`}
              className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 sm:p-4 dark:border-zinc-700 dark:bg-zinc-950/60"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                {captionRatings[index] ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">AI score:</span>
                    <span
                      className={`rounded-lg border px-2 py-1 text-xs font-medium ${CAPTION_RATING_ACTIVE[captionRatings[index]!]}`}
                    >
                      {CAPTION_RATING_LABELS[captionRatings[index]!]}
                    </span>
                  </div>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  title={fav[index] ? "Remove favorite" : "Add favorite"}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-xl leading-none text-zinc-500 transition hover:bg-zinc-200/80 hover:text-amber-500 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  onClick={() => onToggleFavorite(index)}
                  aria-label={fav[index] ? "Remove favorite" : "Add favorite"}
                >
                  {fav[index] ? "★" : "☆"}
                </button>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  {locked ? (
                    <div className="relative min-h-[12rem] overflow-hidden rounded-xl border border-purple-500/40 bg-zinc-100/80 dark:border-purple-500/35 dark:bg-zinc-900/40">
                      <p className="select-none px-4 py-3 leading-7 blur-xl" aria-hidden>
                        {caption}
                      </p>
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 px-4 py-5 text-center backdrop-blur-[2px] dark:bg-zinc-950/85">
                        <span className="text-purple-600 dark:text-purple-400" aria-hidden>
                          <svg
                            className="mx-auto h-7 w-7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.75}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                            />
                          </svg>
                        </span>
                        <p className="max-w-[16rem] text-sm font-semibold leading-snug text-zinc-900 dark:text-white">
                          Upgrade to Pro to unlock
                        </p>
                        <button
                          type="button"
                          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-500 disabled:opacity-50"
                          disabled={checkoutLoading}
                          onClick={() => onStartCheckout("month")}
                        >
                          Upgrade to Pro
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words leading-7 text-zinc-800 dark:text-zinc-200">
                      {caption}
                    </p>
                  )}
                  {!locked ? (
                    <>
                      {captionScores?.[index] ? (
                        <CaptionScoreBar score={captionScores[index]!} />
                      ) : null}
                      <CaptionBestTimeBadge time={times[index]} rating={rating} loading={timesLoading} />
                      <p className="mt-2 text-xs text-zinc-500">{caption.length} characters</p>
                      {emojiPerCaption[index]?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {emojiPerCaption[index]!.map((em) => (
                            <span key={em} className="text-lg">
                              {em}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <div className="sm:shrink-0">
                  <CaptionActions
                    caption={caption}
                    copyLabel={copiedIndex === index ? "Copied!" : "Copy"}
                    disabled={locked}
                    copyDisabledReason={locked ? "Upgrade to Pro to copy your Best-rated caption" : undefined}
                    onCopy={() => onCopy(caption, index)}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
