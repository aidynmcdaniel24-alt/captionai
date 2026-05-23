"use client";

import {
  VIRAL_HOOKS,
  totalHookCount,
  type HookCategoryId,
} from "@/lib/viral-hooks";
import { useMemo, useState } from "react";

type HookLibraryTabProps = {
  onUseHook: (hookText: string) => void;
};

type FilterValue = HookCategoryId | "all";

export function HookLibraryTab({ onUseHook }: HookLibraryTabProps) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (filter === "all") return VIRAL_HOOKS;
    return VIRAL_HOOKS.filter((cat) => cat.id === filter);
  }, [filter]);

  async function applyHook(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore — still fill the topic */
    }
    onUseHook(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
          Viral hook library
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {totalHookCount()} proven opening lines. Tap one to copy it and drop it
          straight into your caption topic.
        </p>
      </div>

      <div
        className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1 hide-scrollbar"
        role="tablist"
        aria-label="Hook categories"
      >
        {(
          [
            { id: "all" as const, label: "All" },
            ...VIRAL_HOOKS.map((cat) => ({ id: cat.id, label: cat.label })),
          ]
        ).map((opt) => {
          const active = filter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(opt.id)}
              className={`inline-flex min-h-[36px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-purple-600 text-white shadow-sm"
                  : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-6">
        {visible.map((category) => (
          <section key={category.id}>
            <div className="mb-2 flex flex-col gap-0.5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-300">
                {category.label}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {category.description}
              </p>
            </div>
            <ul
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-thin-x sm:-mx-1 sm:px-1"
              aria-label={`${category.label} hooks`}
            >
              {category.hooks.map((hook) => {
                const isCopied = copiedId === hook.id;
                return (
                  <li
                    key={hook.id}
                    className="min-w-[260px] max-w-[320px] shrink-0 sm:min-w-[280px]"
                  >
                    <button
                      type="button"
                      onClick={() => applyHook(hook.text, hook.id)}
                      className={`group flex h-full w-full flex-col items-start gap-2 rounded-2xl border px-3.5 py-3 text-left text-sm font-medium transition ${
                        isCopied
                          ? "border-emerald-400 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-500/50 dark:bg-emerald-950/40 dark:text-emerald-100"
                          : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-purple-500/60 dark:hover:bg-purple-950/40 dark:hover:text-purple-100"
                      }`}
                    >
                      <span className="leading-snug">{hook.text}</span>
                      <span className="flex flex-wrap items-center gap-1">
                        {hook.platforms.map((p) => (
                          <span
                            key={p}
                            className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                          >
                            {p}
                          </span>
                        ))}
                      </span>
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wide ${
                          isCopied
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-purple-600 dark:text-purple-300"
                        }`}
                      >
                        {isCopied ? "Copied + filled topic" : "Tap to use"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
