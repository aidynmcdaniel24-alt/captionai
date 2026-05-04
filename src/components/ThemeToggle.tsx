"use client";

import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full border border-zinc-600 bg-zinc-900/40 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-900/40 ${className}`}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
      <span aria-hidden>{theme === "dark" ? "🌙" : "☀️"}</span>
    </button>
  );
}
