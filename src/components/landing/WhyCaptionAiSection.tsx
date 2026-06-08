"use client";

import { motion } from "framer-motion";

type Cell = boolean | "partial";

const rows: { feature: string; manual: Cell; generic: Cell; captionai: Cell }[] = [
  { feature: "Captions in seconds", manual: false, generic: true, captionai: true },
  { feature: "Sounds like you, not a bot", manual: true, generic: false, captionai: true },
  { feature: "Tuned per platform (IG, TikTok, LinkedIn, X)", manual: "partial", generic: false, captionai: true },
  { feature: "Relevant hashtags included", manual: "partial", generic: false, captionai: true },
  { feature: "Multiple options to pick from", manual: false, generic: "partial", captionai: true },
  { feature: "No prompt-engineering required", manual: true, generic: false, captionai: true },
  { feature: "Built specifically for social captions", manual: false, generic: false, captionai: true },
];

const columns = [
  { key: "manual" as const, label: "Writing manually" },
  { key: "generic" as const, label: "Generic AI tools" },
  { key: "captionai" as const, label: "CaptionAI", highlight: true },
];

function Mark({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
        <span className="sr-only">Partial</span>
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span className="sr-only">No</span>
    </span>
  );
}

export function WhyCaptionAiSection() {
  return (
    <section id="why" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
            Why CaptionAI?
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Faster than writing by hand, sharper than generic AI
          </h2>
          <p className="mt-3 text-base text-zinc-600 sm:mt-4 sm:text-lg dark:text-zinc-400">
            Manual captions sound like you but eat your time. Generic AI is fast but sounds like a
            robot. CaptionAI is the one that does both.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mt-10 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/5 sm:mt-14 dark:border-white/10 dark:bg-zinc-900/50"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10">
                  <th className="px-4 py-4 text-sm font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">
                    What matters
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-3 py-4 text-center text-sm font-semibold sm:px-4 ${
                        col.highlight
                          ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300"
                          : "text-zinc-600 dark:text-zinc-300"
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-zinc-100 last:border-0 dark:border-white/[0.06]"
                  >
                    <td className="px-4 py-4 text-sm font-medium text-zinc-700 sm:px-6 dark:text-zinc-300">
                      {row.feature}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-4 text-center sm:px-4 ${
                          col.highlight ? "bg-purple-50/60 dark:bg-purple-500/[0.06]" : ""
                        }`}
                      >
                        <span className="inline-flex justify-center">
                          <Mark value={row[col.key]} />
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-500"
        >
          Generic AI tools = general-purpose chatbots and writing assistants not built for social captions.
        </motion.p>
      </div>
    </section>
  );
}
