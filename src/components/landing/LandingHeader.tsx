"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

const nav = [
  { label: "Features", href: "#features" },
  { label: "Try it", href: "#demo" },
  { label: "Pricing", href: "/pricing" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const { isSignedIn, isLoaded } = useUser();

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/80"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white"
        >
          <BrandLogo priority className="h-8 w-8 shrink-0" />
          <span className="truncate">CaptionAI</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) =>
            item.href.startsWith("#") ? (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden min-h-[40px] items-center gap-3 md:flex">
          <ThemeToggle />
          {!isLoaded ? (
            <div className="h-9 w-28 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden />
          ) : isSignedIn ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-purple-600/25 transition hover:bg-purple-500"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-purple-600/25 transition hover:bg-purple-500"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 text-zinc-800 dark:border-zinc-700 dark:text-white"
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="landing-mobile-menu"
          className="border-t border-zinc-200 bg-white/95 px-4 pb-5 pt-3 dark:border-white/5 dark:bg-zinc-950/95 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {nav.map((item) =>
              item.href.startsWith("#") ? (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex min-h-[48px] items-center rounded-lg px-3 text-base font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-[48px] items-center rounded-lg px-3 text-base font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ),
            )}
            <div className="mt-2 flex flex-col gap-2">
              {!isLoaded ? (
                <div className="h-12 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden />
              ) : isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-purple-600 px-5 text-base font-semibold text-white shadow-lg shadow-purple-600/25"
                  onClick={() => setOpen(false)}
                >
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-zinc-300 px-5 text-base font-medium text-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-purple-600 px-5 text-base font-semibold text-white shadow-lg shadow-purple-600/25"
                    onClick={() => setOpen(false)}
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </motion.header>
  );
}
