"use client";

import {
  gradientTitleClass,
  MarketingHero,
  MarketingPageShell,
} from "@/components/marketing/MarketingPageShell";
import { PRIVACY_LAST_UPDATED, PRIVACY_SECTIONS, type PrivacyBlock, type PrivacySection } from "@/lib/privacy-data";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support-contact";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function PrivacyProse({ blocks }: { blocks: PrivacyBlock[] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 text-[15px] leading-[1.75] text-zinc-600 dark:text-zinc-400"
    >
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return <p key={i}>{block.text}</p>;
        }
        return (
          <ul key={i} className="list-disc space-y-2.5 pl-5 marker:text-purple-500/70">
            {block.items.map((item, j) => (
              <li key={j}>
                {item.label ? (
                  <>
                    <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{item.label}</strong> {item.text}
                  </>
                ) : (
                  item.text
                )}
              </li>
            ))}
          </ul>
        );
      })}
    </motion.div>
  );
}

function PrivacySectionCard({ section }: { section: PrivacySection }) {
  return (
    <motion.article
      id={section.id}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="scroll-mt-32 rounded-2xl border border-zinc-200/90 border-l-[3px] border-l-purple-500 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800/90 dark:border-l-purple-500 dark:bg-zinc-900/40"
    >
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl dark:text-white">
        <span className="mr-2 text-purple-600 dark:text-purple-400">{section.number}.</span>
        {section.title}
      </h2>
      <motion.div className="mt-5">
        <PrivacyProse blocks={section.blocks} />
      </motion.div>
    </motion.article>
  );
}

function TableOfContents({
  activeId,
  onNavigate,
}: {
  activeId: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <nav aria-label="Table of contents" className="hidden lg:block">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-500">On this page</p>
      <ul className="mt-4 space-y-1 border-l border-zinc-200 dark:border-zinc-800">
        {PRIVACY_SECTIONS.map((section) => {
          const isActive = activeId === section.id;
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onNavigate(section.id)}
                className={`-ml-px block w-full border-l-2 py-2 pl-4 text-left text-sm transition ${
                  isActive
                    ? "border-purple-600 font-medium text-purple-700 dark:border-purple-400 dark:text-purple-300"
                    : "border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                }`}
              >
                {section.number}. {section.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function BackToTopButton({ visible }: { visible: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-lg transition hover:border-purple-300 hover:text-purple-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-purple-500/50 dark:hover:text-purple-300"
          aria-label="Back to top"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
          Top
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

export function PrivacyPage() {
  const [activeId, setActiveId] = useState(PRIVACY_SECTIONS[0]?.id ?? "");
  const [showBackToTop, setShowBackToTop] = useState(false);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 480);

      const offset = 140;
      let current = PRIVACY_SECTIONS[0]?.id ?? "";
      for (const section of PRIVACY_SECTIONS) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= offset) {
          current = section.id;
        }
      }
      setActiveId(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Legal"
        title={<h1 className={gradientTitleClass}>Privacy Policy</h1>}
        description="How we collect, use, and protect your information when you use CaptionAI."
        meta={
          <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" aria-hidden />
            Last updated: {PRIVACY_LAST_UPDATED}
          </p>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <TableOfContents activeId={activeId} onNavigate={scrollToSection} />
            <nav className="mt-8 lg:hidden" aria-label="Table of contents">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Jump to section</p>
              <select
                className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                value={activeId}
                onChange={(e) => scrollToSection(e.target.value)}
              >
                {PRIVACY_SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.number}. {s.title}
                  </option>
                ))}
              </select>
            </nav>
          </aside>

          <div className="mt-10 space-y-6 lg:mt-0">
            {PRIVACY_SECTIONS.map((section) => (
              <PrivacySectionCard key={section.id} section={section} />
            ))}

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className="mt-4 rounded-2xl border border-zinc-200/90 border-l-[3px] border-l-purple-500 bg-gradient-to-br from-purple-50/80 via-white to-white p-8 sm:p-10 dark:border-zinc-800 dark:border-l-purple-500 dark:from-purple-950/30 dark:via-zinc-900/50 dark:to-zinc-900/50"
            >
              <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">Questions about privacy?</h2>
              <p className="mt-3 max-w-xl text-[15px] leading-[1.75] text-zinc-600 dark:text-zinc-400">
                If you have questions about this policy, your data, or how to exercise your rights, reach out — we&apos;re
                happy to help.
              </p>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <a
                  href={SUPPORT_MAILTO}
                  className="inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-purple-900/20 transition hover:bg-purple-500"
                >
                  Email {SUPPORT_EMAIL}
                </a>
                <Link
                  href="/support"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:border-purple-300 hover:text-purple-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-purple-500/50 dark:hover:text-purple-300"
                >
                  Contact form
                </Link>
              </motion.div>
            </motion.section>
          </div>
        </div>
      </div>

      <BackToTopButton visible={showBackToTop} />
    </MarketingPageShell>
  );
}
