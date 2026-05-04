import Link from "next/link";
import type { ReactNode } from "react";

type MarketingDocLayoutProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
};

/** Legal / docs pages with hero, light + dark mode, purple accents. */
export function MarketingDocLayout({ title, subtitle, eyebrow = "CaptionAI", children }: MarketingDocLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-gradient-to-b dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200/90 bg-white/85 backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-sm font-semibold text-zinc-900 transition-colors hover:text-purple-600 dark:text-white dark:hover:text-purple-400"
          >
            ← CaptionAI home
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-zinc-200 bg-gradient-to-br from-purple-50 via-white to-zinc-50 px-4 py-12 sm:px-6 sm:py-16 dark:border-zinc-800 dark:from-zinc-950 dark:via-purple-950/30 dark:to-zinc-950">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl dark:bg-purple-600/15"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">{title}</h1>
          {subtitle ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">{subtitle}</p>
          ) : null}
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">{children}</main>
    </div>
  );
}
