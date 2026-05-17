"use client";

import { useTheme } from "@/components/ThemeProvider";
import { useSyncExternalStore } from "react";

function subscribeNoop() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);

  const ariaLabel = mounted
    ? theme === "dark"
      ? "Switch to light mode"
      : "Switch to dark mode"
    : "Toggle color mode";

  const label = mounted ? (theme === "dark" ? "Dark" : "Light") : "Theme";
  const icon = mounted ? (theme === "dark" ? "🌙" : "☀️") : "◐";

  return (
    <button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      className={`inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-200 dark:shadow-none dark:hover:bg-zinc-800 ${className}`}
      aria-label={ariaLabel}
    >
      <span suppressHydrationWarning className="hidden sm:inline">
        {label}
      </span>
      <span suppressHydrationWarning aria-hidden>
        {icon}
      </span>
    </button>
  );
}
