"use client";

import { motion } from "framer-motion";

type Testimonial = {
  quote: string;
  name: string;
  title: string;
  initial: string;
  avatarBg: string;
  avatarRing: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Finally a caption tool that actually sounds like me. I use it every single day.",
    name: "Sarah K.",
    title: "Instagram Creator",
    initial: "S",
    avatarBg: "from-purple-500 to-fuchsia-500",
    avatarRing: "ring-purple-500/30",
  },
  {
    quote:
      "Cut my content creation time in half. The TikTok captions are spot on.",
    name: "Marcus T.",
    title: "Content Creator",
    initial: "M",
    avatarBg: "from-violet-500 to-indigo-500",
    avatarRing: "ring-violet-500/30",
  },
  {
    quote:
      "My LinkedIn engagement went up 40% after switching to CaptionAI captions.",
    name: "Jessica M.",
    title: "Marketing Manager",
    initial: "J",
    avatarBg: "from-fuchsia-500 to-pink-500",
    avatarRing: "ring-fuchsia-500/30",
  },
];

function StarRow() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          aria-hidden
          viewBox="0 0 20 20"
          className="h-4 w-4 text-amber-400"
          fill="currentColor"
        >
          <path d="M9.05.97a1 1 0 0 1 1.9 0l1.9 5.86h6.16a1 1 0 0 1 .59 1.8l-4.98 3.62 1.9 5.86a1 1 0 0 1-1.54 1.12L10 15.6l-4.98 3.62a1 1 0 0 1-1.54-1.12l1.9-5.86L.41 8.62a1 1 0 0 1 .59-1.8h6.16L9.05.97Z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
            Loved by creators
          </p>
          <h2
            id="testimonials-heading"
            className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white"
          >
            What users are saying
          </h2>
          <p className="mt-3 text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
            Real reactions from creators, marketers, and founders shipping content every day.
          </p>
        </motion.div>

        <ul className="mt-10 grid gap-5 sm:mt-14 sm:gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t, idx) => (
            <motion.li
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: idx * 0.06 }}
              className="flex flex-col gap-5 rounded-3xl border border-zinc-200 bg-white/95 p-6 shadow-xl shadow-purple-900/5 sm:p-7 dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-black/20"
            >
              <StarRow />
              <blockquote className="text-base leading-relaxed text-zinc-800 sm:text-lg dark:text-zinc-100">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="mt-auto flex items-center gap-3">
                <div
                  aria-hidden
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.avatarBg} text-base font-bold text-white ring-2 ring-offset-2 ring-offset-white ${t.avatarRing} dark:ring-offset-zinc-900`}
                >
                  {t.initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                    {t.name}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{t.title}</p>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
