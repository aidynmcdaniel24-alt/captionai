"use client";

import {
  DEFAULT_INDUSTRY_KEY,
  INDUSTRIES,
  type Industry,
  getIndustryByKey,
} from "@/lib/industry-templates";
import { useEffect, useState } from "react";

const STORAGE_KEY = "captionai:industry";

function loadStoredIndustry(): string {
  if (typeof window === "undefined") return DEFAULT_INDUSTRY_KEY;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && INDUSTRIES.some((i) => i.key === v)) return v;
  } catch {
    /* localStorage disabled */
  }
  return DEFAULT_INDUSTRY_KEY;
}

/**
 * Industry-specific caption template chips. Replaces the older generic
 * template strip on the Captions tab.
 *
 * - Dropdown switches industries (each industry has 8-10 templates).
 * - Selected industry persists across reloads via localStorage.
 * - Templates render as a horizontal-scrollable chip row on mobile so the
 *   page never re-flows vertically when an industry has 10 long labels.
 */
export function IndustryTemplates({
  topic,
  onPick,
}: {
  topic: string;
  onPick: (prompt: string) => void;
}) {
  const [industryKey, setIndustryKey] = useState<string>(DEFAULT_INDUSTRY_KEY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read localStorage once mounted
    setIndustryKey(loadStoredIndustry());
    setHydrated(true);
  }, []);

  function changeIndustry(next: string) {
    setIndustryKey(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage disabled */
    }
  }

  const industry: Industry = getIndustryByKey(industryKey);

  return (
    <div className="mb-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm text-zinc-600 dark:text-zinc-300">
          Industry templates
        </label>
        <div className="relative">
          <select
            aria-label="Industry"
            value={industry.key}
            onChange={(e) => changeIndustry(e.target.value)}
            className="min-h-[40px] appearance-none rounded-lg border border-zinc-300 bg-white py-1.5 pl-3 pr-9 text-sm font-medium text-zinc-800 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            {INDUSTRIES.map((i) => (
              <option key={i.key} value={i.key}>
                {i.icon} {i.label}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500 dark:text-zinc-400"
          >
            ▼
          </span>
        </div>
      </div>

      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-thin-x sm:-mx-1 sm:px-1"
        role="group"
        aria-label={`${industry.label} caption templates`}
      >
        {industry.templates.map((tpl) => {
          // Only show "active" once hydrated to avoid SSR mismatch flicker.
          const active = hydrated && topic === tpl.prompt;
          return (
            <button
              key={`${industry.key}-${tpl.label}`}
              type="button"
              onClick={() => onPick(tpl.prompt)}
              aria-pressed={active}
              className={`flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                active
                  ? "border-purple-500 bg-purple-600 text-white shadow-sm hover:bg-purple-500"
                  : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-purple-500/60 dark:hover:bg-purple-950/40 dark:hover:text-purple-100"
              }`}
            >
              <span aria-hidden>{industry.icon}</span>
              <span>{tpl.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
