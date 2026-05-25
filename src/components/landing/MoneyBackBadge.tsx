type MoneyBackBadgeProps = {
  className?: string;
  variant?: "emerald" | "purple";
};

/** "30-day money back guarantee" badge with a shield icon. */
export function MoneyBackBadge({ className = "", variant = "emerald" }: MoneyBackBadgeProps) {
  const palette =
    variant === "emerald"
      ? "border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200"
      : "border-purple-300/70 bg-purple-50 text-purple-900 dark:border-purple-500/40 dark:bg-purple-950/40 dark:text-purple-200";

  const iconColor =
    variant === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-purple-600 dark:text-purple-400";

  return (
    <div
      role="img"
      aria-label="30-day money back guarantee — no questions asked"
      className={`inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm ${palette} ${className}`}
    >
      <svg
        className={`h-5 w-5 shrink-0 ${iconColor}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
      <span>
        <span className="font-semibold">30-day money back guarantee</span>
        <span className="opacity-80"> — no questions asked.</span>
      </span>
    </div>
  );
}
