"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "Crafting your perfect caption…",
  "Analyzing your platform…",
  "Adding the finishing touches…",
  "Almost ready…",
];

type Props = {
  /** Optional caption shown above the rotating messages (e.g. "Generating for Instagram"). */
  subject?: string;
};

export function CaptionLoadingState({ subject }: Props) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Indeterminate-feel progress that climbs and slows asymptotically toward ~95%.
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) return p;
        const delta = Math.max(0.6, (100 - p) * 0.045);
        return Math.min(95, p + delta);
      });
    }, 220);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-2xl border border-purple-300/60 bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 p-6 shadow-sm sm:p-8 dark:border-purple-500/30 dark:from-purple-950/40 dark:via-zinc-900/60 dark:to-fuchsia-950/30"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-400/30 blur-3xl dark:bg-purple-500/20" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-fuchsia-300/30 blur-3xl dark:bg-fuchsia-500/15" />

      <div className="relative flex items-start gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-600/30">
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-2xl bg-white/15"
          />
          <svg className="relative h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2.5l1.7 4.8a4.5 4.5 0 0 0 2.7 2.7l4.8 1.7-4.8 1.7a4.5 4.5 0 0 0-2.7 2.7L12 21.2l-1.7-4.8a4.5 4.5 0 0 0-2.7-2.7L2.8 12l4.8-1.7a4.5 4.5 0 0 0 2.7-2.7L12 2.5Z" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          {subject ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-700 dark:text-purple-300">
              {subject}
            </p>
          ) : null}

          <div className="mt-1 h-7 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="text-base font-semibold text-zinc-900 sm:text-lg dark:text-white"
              >
                {LOADING_MESSAGES[index]}
              </motion.p>
            </AnimatePresence>
          </div>

          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Hang tight — this usually takes a couple of seconds.
          </p>

          <div className="mt-4">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-purple-100 dark:bg-purple-950/60">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-violet-500"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2, ease: "linear" }}
              />
              <motion.div
                aria-hidden
                className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ["-30%", "230%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              <span>Generating</span>
              <span className="tabular-nums">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
