"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onUpgrade: (interval?: "month" | "year") => void;
  upgrading?: boolean;
  /** ISO 8601 timestamp when the user's tokens will reset. */
  resetAt?: string | null;
  /** Optional headline override — defaults to the standard reset copy. */
  message?: string;
  /** Current plan — drives whether we upsell Pro (free) or Annual (pro). */
  plan?: "free" | "pro" | "annual" | null;
};

const PRO_BENEFITS: { icon: string; label: string }[] = [
  { icon: "🪙", label: "1,000 tokens every day" },
  { icon: "📊", label: "Caption analytics dashboard" },
  { icon: "🖼️", label: "AI image-to-caption" },
  { icon: "📁", label: "Caption collections to stay organized" },
  { icon: "📥", label: "Export your full history to CSV" },
  { icon: "⚡", label: "Priority generation queue" },
];

const ANNUAL_BENEFITS: { icon: string; label: string }[] = [
  { icon: "♾️", label: "Truly unlimited tokens — never hit a daily cap" },
  { icon: "👑", label: "Elite quality — 7 caption options per generation" },
  { icon: "🏷️", label: "Hashtag Analyzer with full strategy" },
  { icon: "📝", label: "Caption Grader + Competitor Analyzer" },
  { icon: "🗓️", label: "7-day Caption Calendar + CSV export" },
  { icon: "🎨", label: "Brand Tone Profiles" },
];

function formatCountdown(targetIso: string | null | undefined, nowMs: number): string {
  if (!targetIso) return "";
  const target = Date.parse(targetIso);
  if (Number.isNaN(target)) return "";
  const diffMs = target - nowMs;
  if (diffMs <= 0) return "now";
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Premium-feeling upgrade popup shown the moment a user runs out of daily
 * tokens. Free users (200/day) get a Pro upsell; Pro users (1,000/day) get
 * an Annual upsell for truly unlimited tokens. Intercepts EVERY feature so
 * it is the single touchpoint between hitting a wall and converting.
 */
export function TokenUpgradeModal({
  open,
  onClose,
  onUpgrade,
  upgrading,
  resetAt,
  message,
  plan,
}: Props) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const countdown = formatCountdown(resetAt ?? null, now);

  // Pro users have hit their 1,000-token cap → upsell Annual (unlimited).
  // Everyone else (free) → upsell Pro.
  const isProUser = plan === "pro";
  const benefits = isProUser ? ANNUAL_BENEFITS : PRO_BENEFITS;
  const pillLabel = isProUser ? "Upgrade to Annual" : "Upgrade to Pro";
  const heading = isProUser
    ? "You've used all 1,000 tokens today! 🚀"
    : "You've used all your tokens for today! 🎉";
  const defaultMessage = isProUser
    ? "You've hit your 1,000 daily tokens on Pro. Upgrade to Annual for unlimited tokens and never hit a limit again."
    : "Free plan gives you 200 tokens daily. Keep the momentum going — unlock 1,000 daily tokens, analytics, image-to-caption, and more with Pro.";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="token-upgrade-title"
      onClick={onClose}
    >
      <div
        className="relative w-full overflow-hidden rounded-t-3xl border-t border-purple-500/40 bg-gradient-to-br from-zinc-900 via-purple-950 to-fuchsia-950 p-6 text-white shadow-2xl shadow-purple-900/50 sm:max-w-lg sm:rounded-3xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-purple-500/30 blur-3xl" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close upgrade prompt"
          className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-purple-200">
            <span aria-hidden>✨</span>
            <span>{pillLabel}</span>
          </div>

          <h2 id="token-upgrade-title" className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
            {heading}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-purple-100/90 sm:text-base">
            {message ?? defaultMessage}
          </p>

          {countdown ? (
            <div className="mt-5 flex items-center justify-between rounded-2xl border border-purple-400/30 bg-white/5 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-200/80">
                  Tokens reset in
                </p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums">{countdown}</p>
              </div>
              <span className="hidden text-3xl sm:block" aria-hidden>
                ⏳
              </span>
            </div>
          ) : null}

          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <li
                key={benefit.label}
                className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-purple-100"
              >
                <span aria-hidden className="text-base leading-tight">
                  {benefit.icon}
                </span>
                <span className="leading-snug">{benefit.label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-2 sm:gap-3">
            {isProUser ? (
              <>
                <button
                  type="button"
                  disabled={upgrading}
                  onClick={() => onUpgrade("year")}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60"
                >
                  {upgrading ? "Opening Stripe…" : "Upgrade to Annual — $79/year"}
                </button>
                <p className="text-center text-xs font-medium text-emerald-200/80">
                  Unlimited tokens · best value (~27% off monthly)
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={upgrading}
                  onClick={() => onUpgrade("month")}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-purple-900/40 transition hover:from-purple-400 hover:to-fuchsia-400 disabled:opacity-60"
                >
                  {upgrading ? "Opening Stripe…" : "Upgrade to Pro — $9/month"}
                </button>
                <button
                  type="button"
                  disabled={upgrading}
                  onClick={() => onUpgrade("year")}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-purple-300/40 bg-white/5 px-6 py-2.5 text-sm font-semibold text-purple-100 transition hover:bg-white/10 disabled:opacity-60"
                >
                  Or go Annual — $79/year (unlimited tokens)
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-purple-200/80 underline-offset-2 transition hover:text-white hover:underline"
            >
              Wait until tomorrow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
