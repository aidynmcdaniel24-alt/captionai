"use client";

import {
  gradientTitleClass,
  MarketingHero,
  MarketingPageShell,
} from "@/components/marketing/MarketingPageShell";
import {
  FAQ_ALL_PILL,
  FAQ_PILLS,
  filterFaqCategories,
  type FaqCategory,
  type FaqItem,
  type FaqPillId,
} from "@/lib/faq-data";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

function CategoryIcon({ icon, className }: { icon: FaqCategory["icon"]; className?: string }) {
  const props = {
    className: `h-[18px] w-[18px] ${className ?? ""}`,
    fill: "none" as const,
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 1.75,
  };

  switch (icon) {
    case "rocket":
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.7 2.7a14.98 14.98 0 01-12.12 6.16 14.98 14.98 0 0112.12-6.16z" />
        </svg>
      );
    case "pricing":
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
      );
    case "account":
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      );
    case "technical":
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      );
  }
}

function FaqAccordionItem({ item, defaultOpen }: { item: FaqItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/80">
      <button
        type="button"
        id={`faq-trigger-${item.id}`}
        aria-expanded={open}
        aria-controls={`faq-panel-${item.id}`}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left transition-colors hover:text-purple-700 dark:hover:text-purple-300"
      >
        <span className="pr-4 text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100">{item.q}</span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-all duration-300 dark:bg-zinc-800 dark:text-zinc-400 ${open ? "rotate-180 bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" : ""}`}
          aria-hidden
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={`faq-panel-${item.id}`}
            role="region"
            aria-labelledby={`faq-trigger-${item.id}`}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 pr-12 text-[15px] leading-[1.7] text-zinc-600 dark:text-zinc-400">{item.a}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function FaqCategoryBlock({
  category,
  searchQuery,
}: {
  category: FaqCategory;
  searchQuery: string;
}) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      id={category.id}
      className="scroll-mt-32"
    >
      <motion.div
        layout
        className="mb-5 flex items-center gap-3"
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset ring-black/5 dark:ring-white/10 ${category.iconBgClass} ${category.iconClass}`}
        >
          <CategoryIcon icon={category.icon} />
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">{category.title}</h2>
      </motion.div>
      <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white px-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 sm:px-6">
        {category.items.map((item, index) => (
          <FaqAccordionItem
            key={item.id}
            item={item}
            defaultOpen={Boolean(searchQuery.trim()) && index === 0}
          />
        ))}
      </div>
    </motion.section>
  );
}

export function FaqPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activePill, setActivePill] = useState<FaqPillId>(FAQ_ALL_PILL);

  const isSearching = searchQuery.trim().length > 0;
  const effectivePill = isSearching ? FAQ_ALL_PILL : activePill;

  const filteredCategories = useMemo(
    () => filterFaqCategories(searchQuery, effectivePill),
    [searchQuery, effectivePill],
  );

  const hasResults = filteredCategories.length > 0;

  const handlePillClick = useCallback((id: FaqPillId) => {
    setActivePill(id);
    setSearchQuery("");
  }, []);

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Help center"
        title={<h1 className={gradientTitleClass}>Frequently Asked Questions</h1>}
        description="Find answers about CaptionAI — from getting started and pricing to account management and security."
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="space-y-8"
        >
          <label htmlFor="faq-search" className="sr-only">
            Search questions
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              id="faq-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-3.5 pl-12 pr-24 text-[15px] text-zinc-900 shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-purple-500"
              autoComplete="off"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                Clear
              </button>
            ) : null}
          </div>

          <motion.div
            layout
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="FAQ categories"
          >
            {FAQ_PILLS.map((pill) => {
              const isActive = !isSearching && activePill === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handlePillClick(pill.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:border-purple-300 hover:text-purple-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-purple-500/50 dark:hover:text-purple-300"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </motion.div>
        </motion.div>

        <div className="mt-10">
          <AnimatePresence mode="wait">
            {hasResults ? (
              <motion.div
                key={`${effectivePill}-${searchQuery}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-12"
              >
                {filteredCategories.map((category) => (
                  <FaqCategoryBlock key={category.id} category={category} searchQuery={searchQuery} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/30"
              >
                <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No results found</p>
                <p className="mt-2 text-[15px] text-zinc-600 dark:text-zinc-400">
                  Try another keyword or{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setActivePill(FAQ_ALL_PILL);
                    }}
                    className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400"
                  >
                    browse all topics
                  </button>
                  .
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-48px" }}
          transition={{ duration: 0.45 }}
          className="mt-20 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-12 dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Still have questions?</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            Can&apos;t find what you&apos;re looking for? Our support team typically responds within one business day.
          </p>
          <Link
            href="/support"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-purple-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/25 transition hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
          >
            Contact support
          </Link>
        </motion.section>
      </div>
    </MarketingPageShell>
  );
}
