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
  { label: "Pricing", href: "#pricing" },
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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white"
        >
          <BrandLogo priority className="h-8 w-8 shrink-0" />
          <span>CaptionAI</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              {item.label}
            </a>
          ))}
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

        <button
          type="button"
          className="rounded-lg border border-zinc-300 p-2 text-zinc-800 dark:border-zinc-700 dark:text-white md:hidden"
          aria-expanded={open}
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open ? (
        <div className="border-t border-zinc-200 bg-white/95 px-4 py-4 dark:border-white/5 dark:bg-zinc-950/95 md:hidden">
          <div className="flex flex-col gap-3">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg py-2 text-zinc-700 dark:text-zinc-300"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            {!isLoaded ? (
              <div className="h-11 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden />
            ) : isSignedIn ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-purple-600 py-3 text-center font-medium text-white"
                onClick={() => setOpen(false)}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="py-2 text-zinc-700 dark:text-zinc-300" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-full bg-purple-600 py-3 text-center font-medium text-white"
                  onClick={() => setOpen(false)}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </motion.header>
  );
}
