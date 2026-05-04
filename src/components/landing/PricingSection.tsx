"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "framer-motion";

export function PricingSection() {
  const { isSignedIn, isLoaded } = useUser();
  return (
    <section id="pricing" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">Simple pricing</h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            Start free. Upgrade when you are posting every day and need unlimited generations.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3 lg:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="flex flex-col rounded-3xl border border-zinc-200 bg-white/90 p-8 shadow-xl dark:border-white/10 dark:bg-zinc-900/50"
          >
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Free</p>
            <p className="mt-2 text-4xl font-bold text-zinc-900 dark:text-white">
              $0<span className="text-lg font-normal text-zinc-500">/mo</span>
            </p>
            <ul className="mt-8 flex flex-1 flex-col gap-4 text-sm text-zinc-700 dark:text-zinc-300">
              <li className="flex gap-3">
                <span className="text-purple-600 dark:text-purple-400">✓</span>
                <span>5 AI caption generations per day</span>
              </li>
              <li className="flex gap-3">
                <span className="text-purple-600 dark:text-purple-400">✓</span>
                <span>All platforms & tones</span>
              </li>
              <li className="flex gap-3">
                <span className="text-purple-600 dark:text-purple-400">✓</span>
                <span>Copy-ready captions with hashtags</span>
              </li>
            </ul>
            {!isLoaded ? (
              <div className="mt-10 h-12 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden />
            ) : isSignedIn ? (
              <Link
                href="/dashboard"
                className="mt-10 inline-flex min-h-[48px] items-center justify-center rounded-full border border-zinc-300 py-3 font-semibold text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-white dark:hover:bg-white/5"
              >
                Go to dashboard
              </Link>
            ) : (
              <Link
                href="/sign-up"
                className="mt-10 inline-flex min-h-[48px] items-center justify-center rounded-full border border-zinc-300 py-3 font-semibold text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-white dark:hover:bg-white/5"
              >
                Start free
              </Link>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="relative flex flex-col overflow-hidden rounded-3xl border border-purple-400/40 bg-gradient-to-b from-purple-50/90 to-white p-8 shadow-2xl shadow-purple-500/15 dark:border-purple-500/40 dark:from-purple-950/40 dark:to-zinc-900/80 dark:shadow-purple-950/40"
          >
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-purple-400/25 blur-3xl dark:bg-purple-500/20" />
            <div className="relative">
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Pro</p>
              <p className="mt-2 text-4xl font-bold text-zinc-900 dark:text-white">
                $9<span className="text-lg font-normal text-zinc-500 dark:text-zinc-400">/month</span>
              </p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Unlimited captions. Cancel anytime from your account.
              </p>
              <ul className="mt-8 flex flex-1 flex-col gap-4 text-sm text-zinc-800 dark:text-zinc-200">
                <li className="flex gap-3">
                  <span className="text-purple-600 dark:text-purple-400">✓</span>
                  <span>Unlimited generations</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-600 dark:text-purple-400">✓</span>
                  <span>Same studio workflow—no limits</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-600 dark:text-purple-400">✓</span>
                  <span>Manage billing in-app via Stripe</span>
                </li>
              </ul>
              {!isLoaded ? (
                <div className="mt-10 h-12 animate-pulse rounded-full bg-purple-200/80 dark:bg-purple-900/50" aria-hidden />
              ) : isSignedIn ? (
                <Link
                  href="/upgrade"
                  className="mt-10 inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-purple-600 px-8 py-3.5 text-base font-bold text-white shadow-[0_0_24px_-4px_rgba(168,85,247,0.75)] transition hover:bg-purple-500 hover:shadow-[0_0_32px_-4px_rgba(192,132,252,0.55)] sm:w-auto"
                >
                  Upgrade to Pro
                </Link>
              ) : (
                <Link
                  href="/sign-up"
                  className="mt-10 inline-flex min-h-[52px] items-center justify-center rounded-full bg-purple-600 py-3.5 font-semibold text-white shadow-lg shadow-purple-600/40 transition hover:bg-purple-500"
                >
                  Get started — upgrade after signup
                </Link>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="flex flex-col rounded-3xl border border-emerald-300/50 bg-white/90 p-8 shadow-xl dark:border-emerald-500/30 dark:bg-zinc-900/50"
          >
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Pro annual</p>
            <p className="mt-2 text-4xl font-bold text-zinc-900 dark:text-white">
              $79<span className="text-lg font-normal text-zinc-500 dark:text-zinc-400">/year</span>
            </p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Best value for daily creators. Uses Stripe annual price when configured.
            </p>
            <ul className="mt-8 flex flex-1 flex-col gap-4 text-sm text-zinc-800 dark:text-zinc-200">
              <li className="flex gap-3">
                <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                <span>Unlimited generations</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                <span>One payment per year — your team can enable this in billing</span>
              </li>
            </ul>
            {!isLoaded ? (
              <div className="mt-10 h-12 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden />
            ) : isSignedIn ? (
              <Link
                href="/upgrade?billing=annual"
                className="mt-10 inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-emerald-500/60 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-500/50 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
              >
                Upgrade annual
              </Link>
            ) : (
              <Link
                href="/sign-up"
                className="mt-10 inline-flex min-h-[48px] items-center justify-center rounded-full border border-emerald-500/50 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
              >
                Get started
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
