"use client";

import { FooterSection } from "@/components/landing/FooterSection";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { MoneyBackBadge } from "@/components/landing/MoneyBackBadge";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

type PlanKey = "free" | "monthly" | "annual";

const PLANS: {
  key: PlanKey;
  name: string;
  price: string;
  period: string;
  blurb: string;
  ctaSignedOut: { label: string; href: string };
  ctaSignedIn: { label: string; href: string };
  highlight?: boolean;
  accent: string;
}[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    blurb: "Perfect for trying CaptionAI and casual posters.",
    ctaSignedOut: { label: "Start free", href: "/sign-up" },
    ctaSignedIn: { label: "Go to dashboard", href: "/dashboard" },
    accent: "border-zinc-200 dark:border-white/10",
  },
  {
    key: "monthly",
    name: "Pro monthly",
    price: "$9",
    period: "/month",
    blurb: "Unlimited captions, every advanced tool, cancel anytime.",
    ctaSignedOut: { label: "Get started", href: "/sign-up" },
    ctaSignedIn: { label: "Upgrade monthly", href: "/upgrade?billing=month" },
    highlight: true,
    accent: "border-purple-400/50 dark:border-purple-500/50",
  },
  {
    key: "annual",
    name: "Pro annual",
    price: "$79",
    period: "/year",
    blurb: "Best value — save ~27% vs. monthly. Two months free.",
    ctaSignedOut: { label: "Get started", href: "/sign-up" },
    ctaSignedIn: { label: "Upgrade annual", href: "/upgrade?billing=annual" },
    accent: "border-emerald-300/60 dark:border-emerald-500/30",
  },
];

type FeatureRow = {
  label: string;
  free: string | true | false;
  monthly: string | true | false;
  annual: string | true | false;
};

const FEATURES: FeatureRow[] = [
  { label: "Daily caption generations", free: "5 / day", monthly: "Unlimited", annual: "Unlimited" },
  { label: "All platforms (IG, TikTok, LinkedIn, X, FB…)", free: true, monthly: true, annual: true },
  { label: "All tones (funny, professional, hype, etc.)", free: true, monthly: true, annual: true },
  { label: "Hashtags built into every caption", free: true, monthly: true, annual: true },
  { label: "Caption scoring + AI ratings", free: "Limited", monthly: true, annual: true },
  { label: "Pro Boost — elite copywriting mode", free: false, monthly: true, annual: true },
  { label: "Viral Hook Library", free: false, monthly: true, annual: true },
  { label: "Best-time-to-post insights", free: false, monthly: true, annual: true },
  { label: "Brand voice memory", free: false, monthly: true, annual: true },
  { label: "Bio generator", free: true, monthly: true, annual: true },
  { label: "A/B test captions", free: true, monthly: true, annual: true },
  { label: "Save favorites + history", free: true, monthly: true, annual: true },
  { label: "Buffer scheduling", free: false, monthly: true, annual: true },
  { label: "Stripe-managed billing & portal", free: false, monthly: true, annual: true },
  { label: "Effective monthly cost", free: "Free", monthly: "$9", annual: "$6.58" },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is there a free plan?",
    a: "Yes — every account gets 5 free AI caption generations per day, every platform, every tone, with hashtags. No credit card needed.",
  },
  {
    q: "What is the 30-day money back guarantee?",
    a: "If CaptionAI isn't working for you, email captionaisupport@gmail.com within 30 days of your first Pro charge and we'll refund you. No questions asked.",
  },
  {
    q: "What's the difference between monthly and annual?",
    a: "Both unlock unlimited generations and all Pro features. Pro monthly is $9/month, billed every month. Pro annual is $79/year (about $6.58/month), billed once a year.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Go to Settings → Manage subscription and cancel inside Stripe's customer portal. You keep Pro access until the end of your billing period.",
  },
  {
    q: "Can I switch between monthly and annual later?",
    a: "Yes — you can upgrade from monthly to annual (or downgrade) at any time from your billing portal.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit and debit cards via Stripe. Apple Pay, Google Pay, and other Stripe-supported methods are available where Stripe enables them.",
  },
  {
    q: "Do you offer team or volume pricing?",
    a: "Reach out at captionaisupport@gmail.com if you're a team of 5+ — we'll set you up with a custom plan.",
  },
];

function Check({ on, label }: { on: boolean; label?: string }) {
  if (label) {
    return <span className="text-sm text-zinc-700 dark:text-zinc-200">{label}</span>;
  }
  return on ? (
    <span aria-label="Included" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4L8.5 12l6.8-6.7a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
      </svg>
    </span>
  ) : (
    <span aria-label="Not included" className="text-zinc-400 dark:text-zinc-600">—</span>
  );
}

function PlanCard({
  plan,
  isSignedIn,
}: {
  plan: (typeof PLANS)[number];
  isSignedIn: boolean;
}) {
  const cta = isSignedIn ? plan.ctaSignedIn : plan.ctaSignedOut;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className={`relative flex flex-col rounded-3xl border bg-white p-6 shadow-xl sm:p-8 dark:bg-zinc-900/70 ${plan.accent} ${
        plan.highlight ? "shadow-purple-500/15 dark:shadow-purple-950/40" : ""
      }`}
    >
      {plan.highlight ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-md">
          Most popular
        </span>
      ) : null}
      <p
        className={`text-sm font-medium ${
          plan.key === "monthly"
            ? "text-purple-700 dark:text-purple-300"
            : plan.key === "annual"
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-zinc-600 dark:text-zinc-400"
        }`}
      >
        {plan.name}
      </p>
      <p className="mt-2 text-4xl font-bold text-zinc-900 dark:text-white">
        {plan.price}
        <span className="text-lg font-normal text-zinc-500 dark:text-zinc-400">{plan.period}</span>
      </p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{plan.blurb}</p>

      <Link
        href={cta.href}
        className={`mt-8 inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-8 py-3 text-base font-semibold transition ${
          plan.highlight
            ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500"
            : plan.key === "annual"
              ? "border border-emerald-500/60 text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
              : "border border-zinc-300 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:text-white dark:hover:bg-white/5"
        }`}
      >
        {cta.label}
      </Link>
    </motion.div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-800/80">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-purple-700 dark:hover:text-purple-300"
      >
        <span className="pr-4 text-[15px] font-medium text-zinc-900 dark:text-zinc-100">{q}</span>
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
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-5 pr-12 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">{a}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function PricingPage() {
  const { isSignedIn } = useUser();
  const signedIn = Boolean(isSignedIn);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-white">
      <LandingHeader />

      <main>
        <section className="px-4 pt-12 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400"
            >
              Pricing
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-white"
            >
              Simple pricing. <span className="bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-fuchsia-400">Honest value.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg dark:text-zinc-400"
            >
              Start free. Upgrade when you&apos;re posting every day and need unlimited captions
              and the full Pro toolkit.
            </motion.p>
            <div className="mt-6 flex justify-center">
              <MoneyBackBadge />
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3 lg:gap-8">
            {PLANS.map((p) => (
              <PlanCard key={p.key} plan={p} isSignedIn={signedIn} />
            ))}
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-2xl text-center"
            >
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
                Compare what each plan includes
              </h2>
              <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
                Everything on Free is also on Pro — Pro just removes the daily cap and unlocks the
                advanced tools.
              </p>
            </motion.div>

            <div className="mt-10 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900/40">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
                    <tr>
                      <th scope="col" className="px-5 py-4">
                        Feature
                      </th>
                      <th scope="col" className="px-5 py-4 text-center">
                        Free
                      </th>
                      <th scope="col" className="px-5 py-4 text-center text-purple-700 dark:text-purple-300">
                        Pro monthly
                      </th>
                      <th scope="col" className="px-5 py-4 text-center text-emerald-700 dark:text-emerald-300">
                        Pro annual
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {FEATURES.map((row, idx) => (
                      <tr
                        key={row.label}
                        className={
                          idx % 2 === 0
                            ? "bg-white dark:bg-zinc-900/20"
                            : "bg-zinc-50/60 dark:bg-zinc-900/40"
                        }
                      >
                        <th
                          scope="row"
                          className="px-5 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-100"
                        >
                          {row.label}
                        </th>
                        {(["free", "monthly", "annual"] as const).map((col) => {
                          const val = row[col];
                          return (
                            <td key={col} className="px-5 py-3 text-center">
                              {typeof val === "boolean" ? (
                                <Check on={val} />
                              ) : (
                                <Check on={true} label={val} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-4 text-center">
              <MoneyBackBadge variant="purple" />
              <Link
                href={signedIn ? "/upgrade" : "/sign-up"}
                className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-purple-600 px-8 py-3 text-base font-semibold text-white shadow-xl shadow-purple-600/30 transition hover:bg-purple-500"
              >
                {signedIn ? "Upgrade to Pro" : "Start free — upgrade later"}
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="mx-auto max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-2xl text-center"
            >
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
                Pricing FAQ
              </h2>
              <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
                Still on the fence? These are the questions we hear most often.
              </p>
            </motion.div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white px-5 shadow-sm sm:px-6 dark:border-zinc-800 dark:bg-zinc-900/40">
              {FAQS.map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>

            <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
              More questions? Browse the{" "}
              <Link
                href="/faq"
                className="font-medium text-purple-700 underline-offset-4 hover:underline dark:text-purple-300"
              >
                full FAQ
              </Link>{" "}
              or{" "}
              <Link
                href="/support"
                className="font-medium text-purple-700 underline-offset-4 hover:underline dark:text-purple-300"
              >
                contact support
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
