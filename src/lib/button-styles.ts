// Shared button styling so primary/secondary/destructive actions look
// consistent everywhere:
//   - Primary:     purple-600 → fuchsia-600 gradient, white text
//   - Secondary:   outlined purple
//   - Destructive: red
// All are min 44px tall (touch target) with rounded-xl corners.

const BASE =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40";

/** Primary call-to-action: gradient fill. */
export const primaryButtonClass = `${BASE} bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-sm hover:opacity-90`;

/** Secondary action: outlined purple. */
export const secondaryButtonClass = `${BASE} border border-purple-300 bg-transparent text-purple-700 hover:bg-purple-50 dark:border-purple-500/40 dark:text-purple-300 dark:hover:bg-purple-950/40`;

/** Destructive action: red. */
export const destructiveButtonClass = `${BASE} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50`;

/**
 * Helper to compose a button class with extra utility classes appended.
 */
export function buttonClass(
  variant: "primary" | "secondary" | "destructive",
  extra = ""
): string {
  const base =
    variant === "primary"
      ? primaryButtonClass
      : variant === "secondary"
        ? secondaryButtonClass
        : destructiveButtonClass;
  return extra ? `${base} ${extra}` : base;
}
