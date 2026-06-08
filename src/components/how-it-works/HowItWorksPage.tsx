"use client";

import {
  gradientTitleClass,
  MarketingHero,
  MarketingPageShell,
} from "@/components/marketing/MarketingPageShell";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

const STEPS = [
  {
    icon: "🔗",
    n: "01",
    title: "Get your unique link",
    body: "Sign up for free and instantly get a personal tracking link like captionai.com/r/yourcode. No application needed, no approval required.",
  },
  {
    icon: "📣",
    n: "02",
    title: "Share with your audience",
    body: "Post your link on TikTok, Instagram, YouTube, Twitter, your blog, or anywhere your audience hangs out. Every click is tracked automatically.",
  },
  {
    icon: "💰",
    n: "03",
    title: "Earn 20% commission",
    body: "When someone clicks your link and upgrades to Pro you earn $1.80 per month or $15.80 per year. Commissions stack as you refer more people.",
  },
] as const;

const COMMISSION_TIERS = [
  { referrals: 10, monthly: 18, annual: 216 },
  { referrals: 50, monthly: 90, annual: 1080 },
  { referrals: 100, monthly: 180, annual: 2160 },
  { referrals: 500, monthly: 900, annual: 10800 },
] as const;

const PAYMENT_FACTS = [
  {
    icon: "💳",
    title: "PayPal or Venmo payouts",
    body: "Get paid the way you prefer — no bank wires or paperwork.",
  },
  {
    icon: "💵",
    title: "Minimum $10 to cash out",
    body: "Request a payout the moment your balance crosses $10.",
  },
  {
    icon: "⏱️",
    title: "Processed within 3–5 business days",
    body: "Approved payouts land quickly, every time.",
  },
] as const;

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I join?",
    a: "There's no application and no approval needed. Just sign up for a free CaptionAI account and head to the affiliate page to grab your link and start sharing.",
  },
  {
    q: "When do I get paid?",
    a: "You can request a payout as soon as your balance hits the $10 minimum. Payouts are sent via PayPal or Venmo and processed within 3–5 business days.",
  },
  {
    q: "Is there a limit to how much I can earn?",
    a: "No limit. The more people you refer, the more you earn — commissions stack with every new Pro subscriber you bring in.",
  },
  {
    q: "What if someone cancels?",
    a: "Your commission is based on the first payment from each referral, so a later cancellation doesn't claw back what you've already earned.",
  },
  {
    q: "How do I track my referrals?",
    a: "Your affiliate dashboard shows clicks, signups, and earnings in real time. Open the affiliate page anytime to see exactly how your link is performing.",
  },
];

function StepsSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
            Three simple steps
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            From link to paycheck
          </h2>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            The whole thing takes under five minutes to set up — then it works while you sleep.
          </p>
        </div>

        <ol className="mt-12 grid gap-5 sm:gap-6 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="relative flex flex-col rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm sm:p-9 dark:border-white/10 dark:bg-zinc-900/60"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-2xl shadow-lg shadow-purple-500/30">
                {s.icon}
              </span>
              <span className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-purple-600 dark:text-purple-400">
                Step {s.n}
              </span>
              <h3 className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                {s.body}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CalculatorSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
            Earnings calculator
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            How much can you earn?
          </h2>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            A small, engaged audience goes a long way. Here&apos;s what referrals add up to.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
          className="mt-10 overflow-hidden rounded-3xl border border-purple-300/60 shadow-xl shadow-purple-900/5 dark:border-purple-500/30"
        >
          <div className="grid grid-cols-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white sm:text-xs">
            <span>Referrals</span>
            <span className="text-right">Per month</span>
            <span className="text-right">Per year</span>
          </div>
          {COMMISSION_TIERS.map((tier, i) => (
            <div
              key={tier.referrals}
              className={`grid grid-cols-3 items-center px-5 py-4 text-sm sm:text-base ${
                i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-zinc-50 dark:bg-white/5"
              }`}
            >
              <span className="font-semibold text-zinc-900 dark:text-white">
                {tier.referrals} referrals
              </span>
              <span className="text-right font-bold text-purple-600 dark:text-purple-400">
                ${tier.monthly.toLocaleString()}/mo
              </span>
              <span className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                ${tier.annual.toLocaleString()}/yr
              </span>
            </div>
          ))}
        </motion.div>

        <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-500">
          Based on monthly Pro plan at $9/month. Annual plan pays $15.80 per referral.
        </p>
      </div>
    </section>
  );
}

function PaymentSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
            Getting paid
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Simple, fast payouts
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {PAYMENT_FACTS.map((fact, i) => (
            <motion.div
              key={fact.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900/60"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-2xl dark:bg-purple-500/15">
                {fact.icon}
              </span>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
                {fact.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {fact.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ item, defaultOpen }: { item: { q: string; a: string }; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/80">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-purple-700 dark:hover:text-purple-300"
      >
        <span className="pr-4 text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
          {item.q}
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-all duration-300 dark:bg-zinc-800 dark:text-zinc-400 ${
            open ? "rotate-180 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" : ""
          }`}
          aria-hidden
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open ? (
        <p className="pb-5 pr-12 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {item.a}
        </p>
      ) : null}
    </div>
  );
}

function FaqSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
            Frequently asked
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Questions, answered
          </h2>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white px-5 shadow-sm sm:px-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          {FAQS.map((f, i) => (
            <FaqItem key={f.q} item={f} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-20 pt-6 sm:px-6 sm:pb-28">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-3xl border border-purple-300/60 bg-gradient-to-br from-purple-600 to-fuchsia-600 px-6 py-12 text-center text-white shadow-2xl shadow-purple-900/30 sm:px-12 sm:py-16">
        <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">Ready to start earning?</h2>
        <p className="max-w-md text-base opacity-90">
          Join hundreds of creators already earning with CaptionAI.
        </p>
        <Link
          href="/affiliate"
          className="group inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full bg-white px-9 py-3 text-base font-bold text-purple-700 shadow-lg transition hover:bg-zinc-100"
        >
          Get your affiliate link
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </section>
  );
}

export function HowItWorksPage() {
  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Affiliate program"
        title={
          <h1 className={gradientTitleClass}>How the CaptionAI Affiliate Program Works</h1>
        }
        description="Share your link. Earn real money. No experience needed."
        meta={
          <div className="flex flex-col items-stretch gap-3 sm:flex-row">
            <Link
              href="/affiliate"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-purple-600 px-8 py-3 text-base font-semibold text-white shadow-xl shadow-purple-600/30 transition hover:bg-purple-500"
            >
              Start earning today
            </Link>
            <Link
              href="/affiliate"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-zinc-300 px-8 py-3 text-base font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-white dark:hover:bg-white/5"
            >
              View your dashboard
            </Link>
          </div>
        }
      />

      <StepsSection />
      <CalculatorSection />
      <PaymentSection />
      <FaqSection />
      <FinalCta />
    </MarketingPageShell>
  );
}
