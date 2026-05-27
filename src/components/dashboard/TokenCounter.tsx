"use client";

type Props = {
  plan: "free" | "pro" | null;
  tokensRemaining: number | null;
  tokensLimit: number | null;
  className?: string;
};

/**
 * Minimal token usage indicator inspired by Claude's clean usage display.
 * Sits subtly next to a generate button so users can see what's left
 * without cluttering the primary call-to-action.
 *
 * - Free: "🪙 190 / 200" in small grey text
 * - Pro:  "∞ Unlimited" in small purple text
 */
export function TokenCounter({
  plan,
  tokensRemaining,
  tokensLimit,
  className = "",
}: Props) {
  const unlimited = plan === "pro" || tokensLimit === null;

  if (unlimited) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-300 ${className}`}
        aria-label="Unlimited tokens"
      >
        <span aria-hidden className="text-sm leading-none">∞</span>
        <span>Unlimited</span>
      </span>
    );
  }

  if (tokensRemaining === null || tokensLimit === null) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums ${className}`}
      aria-label={`${tokensRemaining} of ${tokensLimit} tokens remaining`}
    >
      <span aria-hidden>🪙</span>
      <span>
        {tokensRemaining} / {tokensLimit}
      </span>
    </span>
  );
}
