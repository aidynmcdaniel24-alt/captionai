/**
 * Small, clean trust badges shown near upgrade/checkout buttons to reassure
 * users their payment is safe: "Secured by Stripe" and "SSL Encrypted".
 */
export function TrustBadges({
  className = "",
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const base =
    tone === "dark"
      ? "border-white/10 bg-white/5 text-zinc-300"
      : "border-zinc-200 bg-white/70 text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300";

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-2 ${className}`}
      aria-label="Payment security"
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${base}`}
      >
        <svg
          className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-4z"
          />
        </svg>
        Secured by Stripe
      </span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${base}`}
      >
        <svg
          className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          aria-hidden
        >
          <rect x="4" y="10" width="16" height="10" rx="2" strokeLinejoin="round" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10V7a4 4 0 1 1 8 0v3"
          />
        </svg>
        SSL Encrypted
      </span>
    </div>
  );
}
