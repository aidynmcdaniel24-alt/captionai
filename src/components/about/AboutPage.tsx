"use client";

import { FooterSection } from "@/components/landing/FooterSection";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function useCaptionCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats/captions", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCount(typeof data?.count === "number" ? data.count : 0);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return count;
}

export function AboutPage() {
  const captionCount = useCaptionCount();
  const displayCount = captionCount == null ? "…" : captionCount < 100 ? "Hundreds" : formatNumber(captionCount);

  const stats = [
    { value: displayCount, label: "Captions generated" },
    { value: "500+", label: "Creators using CaptionAI" },
    { value: "30+ min", label: "Saved on every post" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-white">
      <LandingHeader />

      <main>
        <section className="relative overflow-hidden px-4 pb-10 pt-12 sm:px-6 sm:pb-16 sm:pt-20">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-20 top-0 h-[420px] w-[420px] rounded-full bg-purple-500/[0.08] blur-[100px] dark:bg-purple-600/15" />
            <div className="absolute -right-20 top-40 h-[360px] w-[360px] rounded-full bg-fuchsia-400/[0.08] blur-[90px] dark:bg-fuchsia-600/15" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400"
            >
              About CaptionAI
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            >
              Built for creators who&apos;d rather{" "}
              <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-violet-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-fuchsia-400 dark:to-violet-400">
                create
              </span>{" "}
              than caption.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto mt-5 max-w-2xl text-base text-zinc-600 sm:text-lg dark:text-zinc-400"
            >
              CaptionAI is an AI caption generator that helps you ship Instagram, TikTok, LinkedIn,
              and X captions that actually sound like you — in seconds, not hours.
            </motion.p>
          </div>
        </section>

        <section aria-labelledby="story" className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45 }}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400"
            >
              The founder story
            </motion.p>
            <motion.h2
              id="story"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white"
            >
              It started with one caption rewritten five times
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-5 space-y-5 text-[17px] leading-relaxed text-zinc-700 dark:text-zinc-300"
            >
              <p>
                CaptionAI didn&apos;t start as a company — it started as a frustration. Our founder was
                running social for a small brand, juggling Instagram, TikTok, and LinkedIn at once,
                and kept hitting the same wall: the content was done, the photo was good, and then
                the cursor just sat there blinking in an empty caption box.
              </p>
              <p>
                After spending an hour rewriting the same Instagram caption five different ways — and
                still hating all five — the question became impossible to ignore:{" "}
                <em>why am I doing this by hand?</em> The tools that existed didn&apos;t help. They
                spat out generic, lifeless lines that sounded like every other brand on the internet,
                stuffed with hashtags no human would ever type.
              </p>
              <p>
                So we built the thing we actually wanted: a generator that learns voice, tone, and
                the unwritten rules of each platform — captions that feel like a real person wrote
                them at midnight on their phone, not a SaaS bot reading a marketing playbook. The
                first version was a weekend project. The reaction from friends and fellow creators
                made it clear it needed to be more than that.
              </p>
              <p>
                Today, CaptionAI is used by Instagram creators, TikTok content makers, LinkedIn
                thought leaders, small businesses, and founders who&apos;d rather ship work than
                agonize over a caption box. The frustration that started it all is still the thing we
                fight every single day.
              </p>
            </motion.div>
          </div>
        </section>

        <section aria-labelledby="mission" className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl rounded-3xl border border-purple-300/60 bg-gradient-to-br from-purple-50 to-white px-6 py-10 text-center shadow-xl shadow-purple-900/5 sm:px-12 sm:py-14 dark:border-purple-500/30 dark:from-purple-950/40 dark:to-zinc-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
              Our mission
            </p>
            <h2
              id="mission"
              className="mt-3 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-violet-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl dark:from-purple-300 dark:via-fuchsia-300 dark:to-violet-300"
            >
              Give creators back their time.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
              Every minute you spend rewriting captions is a minute you could have spent making the
              next thing. We&apos;re here to take that minute back — and give it to you, every day.
            </p>
          </div>
        </section>

        <section aria-labelledby="vision" className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45 }}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400"
            >
              Where we&apos;re headed
            </motion.p>
            <motion.h2
              id="vision"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white"
            >
              Our vision
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-5 text-[17px] leading-relaxed text-zinc-700 dark:text-zinc-300"
            >
              We believe the best ideas shouldn&apos;t get stuck at the caption box. Captions are just
              the start — our long-term vision is to be the writing layer for every creator, handling
              the words around your content so you can focus on the content itself.
            </motion.p>
            <motion.ul
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
              className="mt-8 grid gap-4 sm:grid-cols-3"
            >
              {[
                {
                  title: "Sound like you",
                  body: "AI that adapts to your voice instead of flattening everyone into the same tone.",
                },
                {
                  title: "Every platform",
                  body: "Native-feeling copy for wherever you post — today, and the platforms that come next.",
                },
                {
                  title: "Creators first",
                  body: "Fair, transparent pricing and a free tier that stays genuinely useful.",
                },
              ].map((v) => (
                <motion.li
                  key={v.title}
                  variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"
                >
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{v.body}</p>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </section>

        <section aria-labelledby="team" className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45 }}
              className="text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
                The people behind it
              </p>
              <h2
                id="team"
                className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white"
              >
                A small team that ships
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                We&apos;re a lean crew of creators, engineers, and writers who use CaptionAI every day
                ourselves. Small team, fast feedback loop, and direct access — when you message us, you
                reach the people actually building the product.
              </p>
            </motion.div>

            <motion.ul
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
              className="mt-10 grid gap-4 sm:grid-cols-3"
            >
              {[
                {
                  name: "Founder & CEO",
                  role: "Product & creator strategy",
                  blurb: "Ran social for a small brand, got tired of the caption box, and built the fix.",
                  initials: "C",
                },
                {
                  name: "Engineering",
                  role: "Models & platform",
                  blurb: "Makes the AI fast, reliable, and tuned to sound human across every platform.",
                  initials: "E",
                },
                {
                  name: "Content & Community",
                  role: "Voice & support",
                  blurb: "Keeps captions sounding real and makes sure every creator gets answers.",
                  initials: "C",
                },
              ].map((m) => (
                <motion.li
                  key={m.name}
                  variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
                  className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 text-xl font-bold text-white">
                    {m.initials}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">{m.name}</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-purple-600 dark:text-purple-400">
                    {m.role}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{m.blurb}</p>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </section>

        <section aria-label="CaptionAI stats" className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="rounded-2xl border border-zinc-200 bg-white px-5 py-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <p className="bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl dark:from-purple-300 dark:to-fuchsia-300">
                  {s.value}
                </p>
                <p className="mt-2 text-sm uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                  {s.label}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <section aria-label="Try CaptionAI" className="px-4 pb-20 pt-6 sm:px-6 sm:pb-28">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-3xl border border-zinc-200 bg-white px-6 py-10 text-center shadow-xl sm:px-12 sm:py-14 dark:border-white/10 dark:bg-zinc-900/60">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
              Ready to caption faster?
            </h2>
            <p className="max-w-md text-base text-zinc-600 dark:text-zinc-400">
              5 free captions per day, every platform, every tone, no credit card needed.
            </p>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-purple-600 px-8 py-3 text-base font-semibold text-white shadow-xl shadow-purple-600/30 transition hover:bg-purple-500"
              >
                Try it free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-zinc-300 px-8 py-3 text-base font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-white dark:hover:bg-white/5"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
