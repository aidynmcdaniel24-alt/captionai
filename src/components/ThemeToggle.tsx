"use client";

import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-200 dark:shadow-none dark:hover:bg-zinc-800 ${className}`}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
      <span aria-hidden>{theme === "dark" ? "🌙" : "☀️"}</span>
    </button>
  );
}
