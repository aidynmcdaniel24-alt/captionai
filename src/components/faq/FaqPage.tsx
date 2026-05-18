"use client";

import { filterFaqCategories, type FaqCategory, type FaqItem } from "@/lib/faq-data";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";

function CategoryIcon({ icon, className }: { icon: FaqCategory["icon"]; className?: string }) {
  const props = { className: `h-5 w-5 ${className ?? ""}`, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.75 };

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
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
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
    <motion.div
      layout
      className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800/90 dark:bg-zinc-900/60"
    >
      <button
        type="button"
        id={`faq-trigger-${item.id}`}
        aria-expanded={open}
        aria-controls={`faq-panel-${item.id}`}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
      >
        <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100">{item.q}</span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-purple-200/80 bg-purple-50 text-purple-700 transition-transform duration-300 dark:border-purple-500/30 dark:bg-purple-950/50 dark:text-purple-300 ${open ? "rotate-180" : ""}`}
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
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <motion.div
              initial={reduceMotion ? false : { y: -4 }}
              animate={{ y: 0 }}
              exit={reduceMotion ? undefined : { y: -4 }}
              transition={{ duration: reduceMotion ? 0 : 0.22 }}
              className="border-t border-zinc-100 px-4 pb-4 pt-3 text-[15px] leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 sm:px-5 sm:pb-5"
            >
              {item.a}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function FaqCategorySection({ category, searchQuery }: { category: FaqCategory; searchQuery: string }) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="scroll-mt-28"
      id={category.id}
    >
      <motion.div
        layout
        className="mb-4 flex items-center gap-3"
      >
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${category.iconBgClass} ${category.iconClass}`}
        >
          <CategoryIcon icon={category.icon} />
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">{category.title}</h2>
        <span className="ml-auto rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {category.items.length}
        </span>
      </motion.div>
      <div className="space-y-2.5">
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
  const filteredCategories = useMemo(() => filterFaqCategories(searchQuery), [searchQuery]);
  const hasResults = filteredCategories.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-gradient-to-b dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 dark:text-zinc-50"
    >
      <header className="sticky top-0 z-20 border-b border-zinc-200/90 bg-white/85 backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-950/80">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6"
        >
          <Link
            href="/"
            className="text-sm font-semibold text-zinc-900 transition-colors hover:text-purple-600 dark:text-white dark:hover:text-purple-400"
          >
            ← CaptionAI home
          </Link>
        </motion.div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-16">
        <div
          className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl"
          aria-hidden
          animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.5, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-200"
          >
            Help center
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Frequently Asked Questions
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-purple-100 sm:text-lg"
          >
            Everything you need to know about CaptionAI — plans, features, billing, and getting started.
          </motion.p>
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="relative z-10 mx-auto -mt-10 max-w-4xl px-4 sm:px-6"
      >
        <label htmlFor="faq-search" className="sr-only">
          Search questions
        </label>
        <motion.div
          whileFocus={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex items-center gap-3 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3.5 shadow-lg shadow-purple-900/5 ring-1 ring-purple-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/30 dark:ring-purple-500/20"
        >
          <svg
            className="h-5 w-5 shrink-0 text-purple-500 dark:text-purple-400"
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
            placeholder="Search for a question..."
            className="min-w-0 flex-1 bg-transparent text-base text-zinc-900 placeholder:text-zinc-400 outline-none dark:text-white dark:placeholder:text-zinc-500"
            autoComplete="off"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              Clear
            </button>
          ) : null}
        </motion.div>
      </motion.div>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <AnimatePresence mode="wait">
          {hasResults ? (
            <motion.div
              key={searchQuery || "all"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-12"
            >
              {filteredCategories.map((category) => (
                <FaqCategorySection key={category.id} category={category} searchQuery={searchQuery} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/40"
            >
              <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">No matching questions</p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Try different keywords or{" "}
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  clear your search
                </button>
                .
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
          className="mt-16 overflow-hidden rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50 via-white to-violet-50 p-8 text-center shadow-sm dark:border-purple-500/25 dark:from-purple-950/40 dark:via-zinc-900/80 dark:to-violet-950/30 sm:p-10"
        >
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
            Still have questions?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            Our team is happy to help with billing, account issues, or anything not covered here.
          </p>
          <Link
            href="/support"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-purple-900/20 transition hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
          >
            Contact support
          </Link>
        </motion.section>
      </main>
    </motion.div>
  );
}
