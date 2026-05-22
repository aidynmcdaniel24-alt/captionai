"use client";

import { motion } from "framer-motion";

const features = [
  {
    title: "Platform-perfect tone",
    description: "Instagram, TikTok, LinkedIn, or X—captions tuned for where you post.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
        />
      </svg>
    ),
  },
  {
    title: "Voice & vibe control",
    description: "Funny, professional, hype, inspirational—match your mood in one click.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
        />
      </svg>
    ),
  },
  {
    title: "Hashtags baked in",
    description: "Relevant tags appended so discovery stays effortless.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.654a.563.563 0 01.45-.225h4.192c1.667 0 3.182-.842 4.043-2.153a4.75 4.75 0 00-3.184-7.429 4.727 4.727 0 00-5.563 0 4.75 4.75 0 00-3.184 7.429z" />
      </svg>
    ),
  },
  {
    title: "Seconds, not hours",
    description: "Generate options fast—spend time posting, not staring at a blank box.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: "Copy-ready workflow",
    description: "Preview, tweak the topic, one-tap copy from your dashboard.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
      </svg>
    ),
  },
  {
    title: "Free to try, Pro when you scale",
    description: "Free daily quota to explore; Pro unlocks unlimited generations.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Built for busy creators
          </h2>
          <p className="mt-3 text-base text-zinc-600 sm:mt-4 sm:text-lg dark:text-zinc-400">
            Everything you need to ship captions that fit your brand—without starting from scratch every time.
          </p>
        </motion.div>

        <motion.ul
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-10 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
        >
          {features.map((f) => (
            <motion.li
              key={f.title}
              variants={item}
              className="group rounded-2xl border border-zinc-200 bg-white/70 p-5 shadow-lg shadow-zinc-900/5 backdrop-blur-sm transition hover:border-purple-300 hover:bg-white sm:p-6 dark:border-white/5 dark:bg-zinc-900/40 dark:shadow-black/20 dark:hover:border-purple-500/20 dark:hover:bg-zinc-900/70"
            >
              <div className="mb-3 inline-flex rounded-xl bg-purple-100 p-3 text-purple-600 transition group-hover:bg-purple-200 group-hover:text-purple-700 sm:mb-4 dark:bg-purple-500/10 dark:text-purple-400 dark:group-hover:bg-purple-500/15 dark:group-hover:text-purple-300">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-zinc-900 sm:text-lg dark:text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 sm:mt-2 dark:text-zinc-400">{f.description}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
