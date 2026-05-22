import Link from "next/link";
import type { ReactNode } from "react";

type MarketingShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** Shared layout for legal/support/marketing subpages (matches landing dark theme). */
export function MarketingShell({ title, subtitle, children }: MarketingShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/5 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex min-h-[40px] items-center text-sm font-semibold text-white"
          >
            ← CaptionAI home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-zinc-400">{subtitle}</p> : null}
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-zinc-300 sm:mt-8">{children}</div>
      </main>
    </div>
  );
}
