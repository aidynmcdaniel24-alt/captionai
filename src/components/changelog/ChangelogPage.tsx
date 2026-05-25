"use client";

import { FooterSection } from "@/components/landing/FooterSection";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { motion } from "framer-motion";
import Link from "next/link";

type ChangelogEntry = {
  date: string;
  badge: "new" | "improved" | "launch";
  title: string;
  items: string[];
};

const ENTRIES: ChangelogEntry[] = [
  {
    date: "May 2026",
    badge: "new",
    title: "Viral hook library, caption scoring, brand voice",
    items: [
      "Viral Hook Library — proven openers grouped by platform and niche, one click to use them.",
      "Caption scoring — hook, emotion, CTA, platform fit, originality, each scored on every caption.",
      "Brand voice memory — captions tuned to sound consistently like your real voice.",
      "Better loading animation with rotating status messages and progress bar.",
    ],
  },
  {
    date: "April 2026",
    badge: "improved",
    title: "Pro plan + Affiliate program",
    items: [
      "Launched the CaptionAI Pro plan — unlimited captions, Pro Boost, and the full creator toolkit.",
      "Launched the affiliate program — earn 20% commission for every Pro signup you bring in.",
      "Added Stripe-managed billing with monthly and annual options ($9/mo or $79/yr).",
      "30-day money back guarantee added to every Pro purchase.",
    ],
  },
  {
    date: "March 2026",
    badge: "launch",
    title: "CaptionAI beta launch",
    items: [
      "Public beta launch — AI captions for Instagram, TikTok, LinkedIn, and X.",
      "Free plan with 5 daily generations launched.",
      "All-platforms, all-tones support with hashtags baked in.",
      "Live demo on the landing page — try CaptionAI without signing up.",
    ],
  },
];

function Badge({ kind }: { kind: ChangelogEntry["badge"] }) {
  const styles =
    kind === "new"
      ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
      : kind === "improved"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
        : "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300";
  const label = kind === "new" ? "New" : kind === "improved" ? "Improved" : "Launch";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${styles}`}>
      {label}
    </span>
  );
}

export function ChangelogPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-white">
      <LandingHeader />

      <main className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
              Changelog
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
              What&apos;s{" "}
              <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-violet-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-fuchsia-400 dark:to-violet-400">
                new
              </span>{" "}
              in CaptionAI
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-400">
              Every release. Every improvement. Everything we shipped for creators.
            </p>
          </motion.div>

          <ol className="relative mt-14 space-y-12 border-l-2 border-purple-200/80 pl-6 sm:pl-8 dark:border-purple-500/30">
            {ENTRIES.map((entry, idx) => (
              <motion.li
                key={entry.date}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: idx * 0.05 }}
                className="relative"
              >
                <span
                  aria-hidden
                  className="absolute -left-[1.625rem] top-1.5 h-4 w-4 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-[0_0_0_4px_rgba(124,58,237,0.18)] sm:-left-[2.125rem]"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-purple-700 dark:text-purple-300">
                    {entry.date}
                  </p>
                  <Badge kind={entry.badge} />
                </div>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-white">
                  {entry.title}
                </h2>
                <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {entry.items.map((it) => (
                    <li key={it} className="flex gap-2.5">
                      <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </motion.li>
            ))}
          </ol>

          <div className="mt-16 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/60">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Something you&apos;d love to see next?
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              We read every request. Drop us a note and we&apos;ll add it to the roadmap.
            </p>
            <Link
              href="/support"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-500"
            >
              Send feedback
            </Link>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
