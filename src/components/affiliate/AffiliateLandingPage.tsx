"use client";

import { AffiliatePageClient } from "@/components/affiliate/AffiliatePageClient";
import { FooterSection } from "@/components/landing/FooterSection";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

const ENROLLED_KEY = "captionai-affiliate-enrolled";
const MONTHLY_COMMISSION = 1.8; // 20% of $9
const ANNUAL_COMMISSION = 15.8; // 20% of $79

function useEnrolled() {
  const [enrolled, setEnrolled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage once on mount
      setEnrolled(window.localStorage.getItem(ENROLLED_KEY) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const enroll = () => {
    try {
      window.localStorage.setItem(ENROLLED_KEY, "1");
    } catch {
      /* ignore */
    }
    setEnrolled(true);
  };

  return { enrolled, hydrated, enroll };
}

function HeroSection({ onEnroll, signedIn }: { onEnroll: () => void; signedIn: boolean }) {
  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-12 sm:px-6 sm:pb-20 sm:pt-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-0 h-[420px] w-[420px] rounded-full bg-purple-500/[0.08] blur-[100px] dark:bg-purple-600/15" />
        <div className="absolute -right-20 top-20 h-[360px] w-[360px] rounded-full bg-fuchsia-400/[0.08] blur-[90px] dark:bg-fuchsia-600/15" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400"
        >
          CaptionAI Affiliate Program
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
        >
          Earn{" "}
          <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-violet-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-fuchsia-400 dark:to-violet-400">
            20% commission
          </span>{" "}
          promoting CaptionAI
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-5 max-w-2xl text-base text-zinc-600 sm:text-lg dark:text-zinc-400"
        >
          Share CaptionAI with creators who hate writing captions. Every time someone you refer
          upgrades to Pro, you earn <strong>20%</strong> of their payment — recurring on every
          renewal.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center"
        >
          {signedIn ? (
            <button
              type="button"
              onClick={onEnroll}
              className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-purple-600 px-9 py-3 text-base font-bold text-white shadow-xl shadow-purple-600/30 transition hover:bg-purple-500"
            >
              Start earning today
            </button>
          ) : (
            <Link
              href="/sign-up?next=/affiliate"
              className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-purple-600 px-9 py-3 text-base font-bold text-white shadow-xl shadow-purple-600/30 transition hover:bg-purple-500"
            >
              Start earning today
            </Link>
          )}
          <a
            href="#how-it-works"
            className="inline-flex min-h-[56px] items-center justify-center rounded-full border border-zinc-300 px-9 py-3 text-base font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-white dark:hover:bg-white/5"
          >
            See how it works
          </a>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
        >
          {[
            { label: "Commission", value: "20%" },
            { label: "Cookie window", value: "30 days" },
            { label: "Min. payout", value: "$10" },
            { label: "Payout speed", value: "3–5 days" },
          ].map((s) => (
            <li
              key={s.label}
              className="rounded-2xl border border-purple-200/70 bg-white px-4 py-4 text-center dark:border-purple-500/30 dark:bg-zinc-900/60"
            >
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{s.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                {s.label}
              </p>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Share your link",
      body: "Get your tracking link from the affiliate dashboard and share it anywhere — TikTok bio, newsletter, threads, DMs.",
    },
    {
      n: "02",
      title: "A friend signs up",
      body: "When someone clicks your link, we attribute them to you for the next 30 days — even if they don't upgrade right away.",
    },
    {
      n: "03",
      title: "You earn 20%",
      body: "Every time they pay for Pro, you earn 20% of the payment. That's $1.80 per $9 monthly and $15.80 per $79 annual.",
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            Three steps to your first commission. The whole thing takes under five minutes.
          </p>
        </div>

        <ol className="mt-12 grid gap-4 sm:gap-6 lg:grid-cols-3">
          {steps.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="relative flex flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-zinc-900/60"
            >
              <span className="bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent dark:from-purple-300 dark:to-fuchsia-300">
                {s.n}
              </span>
              <h3 className="mt-3 text-xl font-bold text-zinc-900 dark:text-white">{s.title}</h3>
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

function EarningsCalculator() {
  const [referrals, setReferrals] = useState(20);
  const [plan, setPlan] = useState<"monthly" | "annual">("monthly");
  const commission = plan === "monthly" ? MONTHLY_COMMISSION : ANNUAL_COMMISSION;
  const monthly = plan === "monthly" ? referrals * commission : (referrals * commission) / 12;
  const yearly = plan === "monthly" ? referrals * commission * 12 : referrals * commission;

  return (
    <section id="calculator" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">Earnings calculator</h2>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            See what you could earn with a small audience. Yes, it&apos;s real.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-purple-300/60 bg-gradient-to-br from-purple-50 to-white p-6 shadow-xl shadow-purple-900/5 sm:p-10 dark:border-purple-500/30 dark:from-purple-950/40 dark:to-zinc-900/70">
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="referrals" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  Active Pro referrals
                </label>
                <span className="rounded-full bg-purple-600 px-3 py-1 text-sm font-bold text-white">
                  {referrals}
                </span>
              </div>
              <input
                id="referrals"
                type="range"
                min={1}
                max={250}
                value={referrals}
                onChange={(e) => setReferrals(Number(e.target.value))}
                className="mt-3 w-full accent-purple-600"
                aria-label="Number of active Pro referrals"
              />
              <div className="mt-1 flex justify-between text-[11px] uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                <span>1</span>
                <span>250</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "monthly" as const, label: "Pro monthly ($9)" },
                  { id: "annual" as const, label: "Pro annual ($79)" },
                ]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPlan(opt.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    plan === opt.id
                      ? "bg-purple-600 text-white shadow"
                      : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                  }`}
                  aria-pressed={plan === opt.id}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-5 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900/60">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                  Estimated monthly
                </p>
                <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">
                  ${monthly.toFixed(2)}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-300/60 bg-white px-5 py-5 text-center shadow-sm dark:border-emerald-500/30 dark:bg-zinc-900/60">
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                  Estimated yearly
                </p>
                <p className="mt-1 text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                  ${yearly.toFixed(2)}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Estimates assume all referrals stay active. Real-world payouts depend on retention
              and Stripe processing fees.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PaymentInfo() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">Get paid your way</h2>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            We support the payout rails creators actually use. No bank wires, no waiting weeks.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "PayPal", body: "Pay out to any PayPal address." },
            { title: "Venmo", body: "US-based affiliates only." },
            { title: "Min. payout", body: "$10 — request anytime once you cross it." },
            { title: "Payout time", body: "3–5 business days after approval." },
          ].map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/60"
            >
              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">{p.title}</p>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS: { q: string; a: string }[] = [
  {
    q: "How much do I earn?",
    a: "You earn 20% of every paid referral — about $1.80 per $9 monthly Pro and $15.80 per $79 annual Pro. Commissions recur for as long as your referral stays a Pro subscriber.",
  },
  {
    q: "Who can join?",
    a: "Anyone with a CaptionAI account can join the affiliate program. There's no audience size requirement and no application — just enroll and start sharing your link.",
  },
  {
    q: "How does attribution work?",
    a: "When someone clicks your tracking link, they're attributed to you for 30 days. If they upgrade to Pro within that window, you earn the commission on their first payment and all renewals.",
  },
  {
    q: "When do I get paid?",
    a: "Once your balance crosses $10, request a payout from your affiliate dashboard. Payouts are processed in 3–5 business days via PayPal or Venmo.",
  },
  {
    q: "Where can I share my link?",
    a: "Anywhere it's allowed — your social media bios, blog posts, newsletter, YouTube descriptions, group chats. Just don't run paid ads on CaptionAI's brand keywords.",
  },
  {
    q: "Can my commission be reversed?",
    a: "Yes, in a few cases: if the original payment is refunded, charged back, or the subscription is canceled within the refund window. We'll always show you what's been credited and what's pending in your dashboard.",
  },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">Affiliate FAQ</h2>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            Quick answers to the most common questions about the affiliate program.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white px-5 shadow-sm sm:px-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          {FAQS.map((f, idx) => (
            <div key={f.q} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/80">
              <button
                type="button"
                aria-expanded={open === idx}
                onClick={() => setOpen((cur) => (cur === idx ? null : idx))}
                className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-purple-700 dark:hover:text-purple-300"
              >
                <span className="pr-4 text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                  {f.q}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition-all duration-300 dark:bg-zinc-800 dark:text-zinc-400 ${
                    open === idx
                      ? "rotate-180 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                      : ""
                  }`}
                  aria-hidden
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              {open === idx ? (
                <p className="pb-5 pr-12 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {f.a}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ onEnroll, signedIn }: { onEnroll: () => void; signedIn: boolean }) {
  return (
    <section className="px-4 pb-20 pt-6 sm:px-6 sm:pb-28">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-3xl border border-purple-300/60 bg-gradient-to-br from-purple-600 to-fuchsia-600 px-6 py-10 text-center text-white shadow-2xl shadow-purple-900/30 sm:px-12 sm:py-14">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Start earning today
        </h2>
        <p className="max-w-md text-base opacity-90">
          You don&apos;t need a huge audience. You just need 5 minutes and a link.
        </p>
        {signedIn ? (
          <button
            type="button"
            onClick={onEnroll}
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-white px-8 py-3 text-base font-bold text-purple-700 shadow-md transition hover:bg-zinc-100"
          >
            Get my tracking link
          </button>
        ) : (
          <Link
            href="/sign-up?next=/affiliate"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-white px-8 py-3 text-base font-bold text-purple-700 shadow-md transition hover:bg-zinc-100"
          >
            Start earning today
          </Link>
        )}
      </div>
    </section>
  );
}

export function AffiliateLandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const { enrolled, hydrated, enroll } = useEnrolled();

  const showDashboard = isLoaded && isSignedIn && hydrated && enrolled;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-white">
      <LandingHeader />

      <main>
        {showDashboard ? (
          <section className="px-4 py-10 sm:px-6 sm:py-14">
            <div className="mx-auto max-w-4xl">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
                    Your affiliate dashboard
                  </p>
                  <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
                    Welcome to the program
                  </h1>
                  <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
                    Share your link, watch the stats roll in, request payouts when you cross $10.
                  </p>
                </div>
                <Link
                  href="#how-it-works"
                  className="text-sm font-medium text-purple-700 underline-offset-4 hover:underline dark:text-purple-300"
                >
                  How it works →
                </Link>
              </div>
              <AffiliatePageClient />
            </div>
          </section>
        ) : (
          <>
            <HeroSection onEnroll={enroll} signedIn={Boolean(isSignedIn)} />
            <HowItWorks />
            <EarningsCalculator />
            <PaymentInfo />
            <FaqSection />
            <FinalCta onEnroll={enroll} signedIn={Boolean(isSignedIn)} />
          </>
        )}
      </main>

      <FooterSection />
    </div>
  );
}
