import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 px-6 py-16 text-center text-zinc-900 dark:bg-zinc-950 dark:text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-purple-500/[0.08] blur-[100px] dark:bg-purple-600/15" />
        <div className="absolute -right-24 bottom-1/4 h-[360px] w-[360px] rounded-full bg-fuchsia-400/[0.08] blur-[90px] dark:bg-fuchsia-600/15" />
      </div>

      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-zinc-900 transition-opacity hover:opacity-80 dark:text-white"
        aria-label="CaptionAI home"
      >
        <BrandLogo className="h-10 w-10" />
        <span>CaptionAI</span>
      </Link>

      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-600 dark:text-purple-400">
        404
      </p>

      <h1 className="mt-3 max-w-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-violet-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-6xl dark:from-purple-400 dark:via-fuchsia-400 dark:to-violet-400">
        Looks like this page went on vacation 🏖️
      </h1>

      <p className="mt-5 max-w-md text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
        We couldn&apos;t find what you were looking for. Maybe a caption ran off with the URL.
        Let&apos;s get you back to safety.
      </p>

      <div className="mt-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-purple-600 px-8 py-3 text-base font-semibold text-white shadow-xl shadow-purple-600/30 transition hover:bg-purple-500 sm:min-w-[180px]"
        >
          Go Home
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-zinc-300 px-8 py-3 text-base font-medium text-zinc-800 transition hover:border-purple-400 hover:bg-zinc-100 sm:min-w-[180px] dark:border-zinc-600 dark:text-zinc-100 dark:hover:border-purple-500/50 dark:hover:bg-white/5"
        >
          Go to Dashboard
        </Link>
      </div>

      <p className="mt-10 text-xs text-zinc-500 dark:text-zinc-500">
        Or take a look at the{" "}
        <Link
          href="/pricing"
          className="font-medium text-purple-700 underline-offset-4 hover:underline dark:text-purple-300"
        >
          pricing
        </Link>
        ,{" "}
        <Link
          href="/faq"
          className="font-medium text-purple-700 underline-offset-4 hover:underline dark:text-purple-300"
        >
          FAQ
        </Link>
        , or{" "}
        <Link
          href="/support"
          className="font-medium text-purple-700 underline-offset-4 hover:underline dark:text-purple-300"
        >
          contact support
        </Link>
        .
      </p>
    </main>
  );
}
