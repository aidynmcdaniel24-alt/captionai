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
          <Link href="/" className="text-sm font-semibold text-white">
            ← CaptionAI home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle ? <p className="mt-2 text-zinc-400">{subtitle}</p> : null}
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-zinc-300">{children}</div>
      </main>
    </div>
  );
}
