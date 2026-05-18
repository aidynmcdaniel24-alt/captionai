"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

type MarketingPageShellProps = {
  children: ReactNode;
};

/** Shared chrome for FAQ, Privacy, and other marketing/legal pages. */
export function MarketingPageShell({ children }: MarketingPageShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
    >
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 text-lg font-semibold tracking-tight text-zinc-900 transition-opacity hover:opacity-80 dark:text-white"
          >
            <BrandLogo priority className="h-8 w-8 shrink-0" />
            <span className="truncate">CaptionAI</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/faq"
              className="hidden text-sm font-medium text-zinc-600 transition-colors hover:text-purple-600 sm:inline dark:text-zinc-400 dark:hover:text-purple-400"
            >
              FAQ
            </Link>
            <Link
              href="/support"
              className="hidden text-sm font-medium text-zinc-600 transition-colors hover:text-purple-600 sm:inline dark:text-zinc-400 dark:hover:text-purple-400"
            >
              Support
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      {children}
    </motion.div>
  );
}

type MarketingHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
};

export function MarketingHero({ eyebrow, title, description, meta }: MarketingHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(147,51,234,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(147,51,234,0.18),transparent)]"
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400"
        >
          {eyebrow}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="mt-4 max-w-3xl"
        >
          {title}
        </motion.div>
        {description ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400"
          >
            {description}
          </motion.div>
        ) : null}
        {meta ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14 }}
            className="mt-6"
          >
            {meta}
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}

export const gradientTitleClass =
  "text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1] bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-violet-400 dark:to-fuchsia-400";
