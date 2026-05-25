"use client";

import { motion } from "framer-motion";

const STATS = [
  { label: "Creators", value: "500+" },
  { label: "Captions", value: "10,000+" },
  { label: "Rating", value: "4.9/5" },
];

export function StatsSection() {
  return (
    <section
      aria-label="CaptionAI social proof"
      className="px-4 pb-4 pt-2 sm:px-6 sm:pb-8 sm:pt-4"
    >
      <motion.ul
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto grid max-w-3xl grid-cols-3 gap-3 rounded-2xl border border-purple-200/70 bg-white/90 px-4 py-5 shadow-lg shadow-purple-900/5 sm:gap-6 sm:px-6 sm:py-6 dark:border-purple-500/20 dark:bg-zinc-900/70 dark:shadow-black/20"
      >
        {STATS.map((stat) => (
          <li key={stat.label} className="text-center">
            <p className="text-xl font-bold tracking-tight text-purple-700 sm:text-3xl dark:text-purple-300">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs dark:text-zinc-400">
              {stat.label}
            </p>
          </li>
        ))}
      </motion.ul>
    </section>
  );
}
