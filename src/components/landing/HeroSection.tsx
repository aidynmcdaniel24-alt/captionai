"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "framer-motion";

export function HeroSection() {
  const { isSignedIn, isLoaded } = useUser();
  return (
    <section className="relative px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:pt-32">
      <div className="mx-auto max-w-6xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-200"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
          </span>
          AI-powered captions for creators & brands
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.08]"
        >
          <span className="text-white">Captions that sound </span>
          <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
            human
          </span>
          <span className="text-white">, scale like </span>
          <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
            magic
          </span>
          <span className="text-white">.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl"
        >
          Describe your photo or idea—get scroll-stopping captions for Instagram, TikTok, LinkedIn, and X in your
          brand voice. Try a live demo below, no account required.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 flex min-h-[52px] flex-col flex-wrap items-center justify-center gap-4 sm:flex-row"
        >
          {!isLoaded ? (
            <div className="h-12 w-56 animate-pulse rounded-full bg-zinc-800" aria-hidden />
          ) : isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex min-h-[48px] min-w-[220px] items-center justify-center rounded-full bg-purple-600 px-8 py-3 text-base font-semibold text-white shadow-xl shadow-purple-600/30 transition hover:bg-purple-500"
              >
                Open dashboard
              </Link>
              <a
                href="#demo"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-zinc-600 px-8 py-3 text-base font-medium text-zinc-200 transition hover:border-purple-500/50 hover:bg-white/5"
              >
                See live demo
              </a>
            </>
          ) : (
            <>
              <Link
                href="/sign-up"
                className="inline-flex min-h-[48px] min-w-[200px] items-center justify-center rounded-full bg-purple-600 px-8 py-3 text-base font-semibold text-white shadow-xl shadow-purple-600/30 transition hover:bg-purple-500 hover:shadow-purple-500/40"
              >
                Create account
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex min-h-[48px] min-w-[200px] items-center justify-center rounded-full border border-purple-500/50 bg-purple-500/5 px-8 py-3 text-base font-semibold text-purple-100 transition hover:border-purple-400 hover:bg-purple-500/15"
              >
                Sign in
              </Link>
              <a
                href="#demo"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-zinc-600 px-8 py-3 text-base font-medium text-zinc-200 transition hover:border-purple-500/50 hover:bg-white/5"
              >
                Try live demo
              </a>
            </>
          )}
        </motion.div>

        {isLoaded && !isSignedIn ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28 }}
            className="mx-auto mt-8 max-w-xl text-sm text-zinc-500"
          >
            Need the full studio with saved usage and billing?{" "}
            <Link href="#account" className="font-medium text-purple-400 underline-offset-4 hover:underline">
              Choose sign in or create account
            </Link>{" "}
            below.
          </motion.p>
        ) : null}
      </div>
    </section>
  );
}
