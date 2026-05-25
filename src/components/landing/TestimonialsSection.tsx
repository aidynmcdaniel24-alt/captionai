"use client";

import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TestimonialSubmitModal } from "./TestimonialSubmitModal";

type Testimonial = {
  id: string;
  name: string;
  title: string;
  message: string;
  rating: number;
  helpful_count: number;
  created_at: string;
};

const ROTATE_MS = 3 * 60 * 1000;
const PER_PAGE = 3;
const HELPFUL_STORAGE_KEY = "captionai:testimonials:helpful";

const AVATAR_GRADIENTS = [
  { bg: "from-purple-500 to-fuchsia-500", ring: "ring-purple-500/30" },
  { bg: "from-violet-500 to-indigo-500", ring: "ring-violet-500/30" },
  { bg: "from-fuchsia-500 to-pink-500", ring: "ring-fuchsia-500/30" },
  { bg: "from-sky-500 to-indigo-500", ring: "ring-sky-500/30" },
  { bg: "from-emerald-500 to-teal-500", ring: "ring-emerald-500/30" },
  { bg: "from-amber-500 to-orange-500", ring: "ring-amber-500/30" },
];

function avatarFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function initialFor(name: string) {
  return name.trim().charAt(0).toUpperCase() || "•";
}

function StarRow({ rating }: { rating: number }) {
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <div className="flex gap-0.5" aria-label={`${clamped} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          aria-hidden
          viewBox="0 0 20 20"
          className={`h-4 w-4 ${
            i < clamped ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"
          }`}
          fill="currentColor"
        >
          <path d="M9.05.97a1 1 0 0 1 1.9 0l1.9 5.86h6.16a1 1 0 0 1 .59 1.8l-4.98 3.62 1.9 5.86a1 1 0 0 1-1.54 1.12L10 15.6l-4.98 3.62a1 1 0 0 1-1.54-1.12l1.9-5.86L.41 8.62a1 1 0 0 1 .59-1.8h6.16L9.05.97Z" />
        </svg>
      ))}
    </div>
  );
}

function readHelpfulSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(HELPFUL_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

function persistHelpfulSet(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      HELPFUL_STORAGE_KEY,
      JSON.stringify(Array.from(set))
    );
  } catch {
    // ignore quota / privacy mode
  }
}

export function TestimonialsSection() {
  const { isSignedIn } = useUser();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [helpfulSet, setHelpfulSet] = useState<Set<string>>(() => readHelpfulSet());
  const [reloadKey, setReloadKey] = useState(0);

  const triggerReload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/testimonials", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          setLoaded(true);
          return;
        }
        const data = (await res.json()) as { items?: Testimonial[] };
        if (cancelled) return;
        setItems(data.items ?? []);
        setLoaded(true);
      } catch {
        if (!cancelled) setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const pages = useMemo(() => {
    if (items.length === 0) return [] as Testimonial[][];
    const out: Testimonial[][] = [];
    for (let i = 0; i < items.length; i += PER_PAGE) {
      out.push(items.slice(i, i + PER_PAGE));
    }
    return out;
  }, [items]);

  useEffect(() => {
    if (pages.length <= 1) return;
    const id = setInterval(() => {
      setPage((p) => (p + 1) % pages.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [pages.length]);

  const handleHelpful = useCallback(async (id: string) => {
    setHelpfulSet((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      persistHelpfulSet(next);
      return next;
    });

    setItems((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, helpful_count: t.helpful_count + 1 } : t
      )
    );

    try {
      const res = await fetch(`/api/testimonials/${id}/helpful`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("request failed");
      }
      const data = (await res.json()) as { helpful_count?: number };
      if (typeof data.helpful_count === "number") {
        setItems((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, helpful_count: data.helpful_count! } : t
          )
        );
      }
    } catch {
      // revert optimistic update on failure
      setItems((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, helpful_count: Math.max(0, t.helpful_count - 1) }
            : t
        )
      );
      setHelpfulSet((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        persistHelpfulSet(next);
        return next;
      });
    }
  }, []);

  const safePage = pages.length === 0 ? 0 : page % pages.length;
  const currentSet = pages[safePage] ?? [];
  const hasTestimonials = items.length > 0;

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

        {!loaded ? (
          <ul
            className="mt-10 grid gap-5 sm:mt-14 sm:gap-6 lg:grid-cols-3"
            aria-hidden
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="h-56 animate-pulse rounded-3xl border border-zinc-200 bg-white/60 dark:border-white/10 dark:bg-zinc-900/40"
              />
            ))}
          </ul>
        ) : !hasTestimonials ? (
          <EmptyState
            onShare={() => setModalOpen(true)}
            isSignedIn={Boolean(isSignedIn)}
          />
        ) : (
          <>
            <div className="relative mt-10 sm:mt-14">
              <AnimatePresence mode="wait">
                <motion.ul
                  key={safePage}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4 }}
                  className="grid gap-5 sm:gap-6 lg:grid-cols-3"
                >
                  {currentSet.map((t) => (
                    <TestimonialCard
                      key={t.id}
                      testimonial={t}
                      helpfulMarked={helpfulSet.has(t.id)}
                      onHelpful={() => handleHelpful(t.id)}
                    />
                  ))}
                </motion.ul>
              </AnimatePresence>
            </div>

            {pages.length > 1 ? (
              <div
                className="mt-8 flex items-center justify-center gap-2"
                role="tablist"
                aria-label="Testimonial pages"
              >
                {pages.map((_, idx) => {
                  const active = idx === safePage;
                  return (
                    <button
                      key={idx}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-label={`Show testimonial set ${idx + 1}`}
                      onClick={() => setPage(idx)}
                      className={`h-2.5 rounded-full transition-all ${
                        active
                          ? "w-8 bg-purple-600 dark:bg-purple-400"
                          : "w-2.5 bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                      }`}
                    />
                  );
                })}
              </div>
            ) : null}

            <div className="mt-10 flex justify-center">
              <ShareButton
                onClick={() => setModalOpen(true)}
                isSignedIn={Boolean(isSignedIn)}
              />
            </div>
          </>
        )}
      </div>

      {modalOpen ? (
        <TestimonialSubmitModal
          onClose={() => setModalOpen(false)}
          onSubmitted={triggerReload}
        />
      ) : null}
    </section>
  );
}

function TestimonialCard({
  testimonial,
  helpfulMarked,
  onHelpful,
}: {
  testimonial: Testimonial;
  helpfulMarked: boolean;
  onHelpful: () => void;
}) {
  const avatar = avatarFor(testimonial.id);
  const initial = initialFor(testimonial.name);

  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-5 rounded-3xl border border-zinc-200 bg-white/95 p-6 shadow-xl shadow-purple-900/5 sm:p-7 dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-black/20"
    >
      <StarRow rating={testimonial.rating} />
      <blockquote className="text-base leading-relaxed text-zinc-800 sm:text-lg dark:text-zinc-100">
        &ldquo;{testimonial.message}&rdquo;
      </blockquote>
      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatar.bg} text-base font-bold text-white ring-2 ring-offset-2 ring-offset-white ${avatar.ring} dark:ring-offset-zinc-900`}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
              {testimonial.name}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {testimonial.title}
            </p>
          </div>
        </div>

        <HelpfulButton
          marked={helpfulMarked}
          count={testimonial.helpful_count}
          onClick={onHelpful}
        />
      </div>
    </motion.li>
  );
}

function HelpfulButton({
  marked,
  count,
  onClick,
}: {
  marked: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={marked}
      aria-pressed={marked}
      aria-label={`Mark testimonial as helpful (${count})`}
      className={`group inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums transition ${
        marked
          ? "border-purple-500 bg-purple-600 text-white shadow-md shadow-purple-600/30"
          : "border-zinc-300 bg-white text-zinc-600 hover:border-purple-400 hover:text-purple-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-purple-400 dark:hover:text-purple-300"
      }`}
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`h-3.5 w-3.5 transition-transform ${
          marked ? "" : "group-hover:-translate-y-0.5"
        }`}
      >
        <path d="M7.493 18.5c-.425 0-.82-.236-.975-.632A8.92 8.92 0 0 1 6 14.6c0-1.087.193-2.13.545-3.096.046-.13.085-.265.085-.405v-3.04c0-.62.504-1.124 1.125-1.124h.054c.508 0 .987-.21 1.334-.582l3.06-3.296a.563.563 0 0 1 .96.367v3.578a.75.75 0 0 0 .75.75h3.328c.667 0 1.18.585 1.106 1.247a25.42 25.42 0 0 1-1.072 4.953 1.125 1.125 0 0 1-1.064.776h-3.677a8.94 8.94 0 0 0-2.347.312l-1.913.51a8.97 8.97 0 0 1-2.281.34l-.51-.014ZM2.62 12a1.498 1.498 0 0 0-1.49 1.345 17.6 17.6 0 0 0 .064 4.073c.083.589.598 1.012 1.193 1.012h.001a1.5 1.5 0 0 0 1.5-1.5v-3.43a1.5 1.5 0 0 0-1.5-1.5h-.232Z" />
      </svg>
      <span>Helpful</span>
      <span
        className={`rounded-full px-1.5 ${
          marked
            ? "bg-white/20"
            : "bg-zinc-100 text-zinc-700 group-hover:bg-purple-100 group-hover:text-purple-700 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-purple-500/20 dark:group-hover:text-purple-200"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ShareButton({
  onClick,
  isSignedIn,
}: {
  onClick: () => void;
  isSignedIn: boolean;
}) {
  if (!isSignedIn) {
    return (
      <Link
        href="/sign-in?redirect_url=/%23testimonials"
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-purple-400 px-5 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 dark:border-purple-500/60 dark:text-purple-200 dark:hover:bg-purple-500/10"
      >
        Sign in to share your experience
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-500"
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M9.05.97a1 1 0 0 1 1.9 0l1.9 5.86h6.16a1 1 0 0 1 .59 1.8l-4.98 3.62 1.9 5.86a1 1 0 0 1-1.54 1.12L10 15.6l-4.98 3.62a1 1 0 0 1-1.54-1.12l1.9-5.86L.41 8.62a1 1 0 0 1 .59-1.8h6.16L9.05.97Z" />
      </svg>
      Share your experience
    </button>
  );
}

function EmptyState({
  onShare,
  isSignedIn,
}: {
  onShare: () => void;
  isSignedIn: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="mx-auto mt-10 max-w-2xl rounded-3xl border border-purple-200 bg-gradient-to-b from-white to-purple-50 p-8 text-center shadow-xl shadow-purple-900/5 sm:mt-14 sm:p-10 dark:border-purple-500/30 dark:from-zinc-900/80 dark:to-purple-950/40"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-600/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7">
          <path d="M9.05.97a1 1 0 0 1 1.9 0l1.9 5.86h6.16a1 1 0 0 1 .59 1.8l-4.98 3.62 1.9 5.86a1 1 0 0 1-1.54 1.12L10 15.6l-4.98 3.62a1 1 0 0 1-1.54-1.12l1.9-5.86L.41 8.62a1 1 0 0 1 .59-1.8h6.16L9.05.97Z" />
        </svg>
      </div>
      <h3 className="mt-4 text-xl font-bold text-zinc-900 sm:text-2xl dark:text-white">
        Be the first to share your experience
      </h3>
      <p className="mt-2 text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
        Tell other creators how CaptionAI helps you. Your testimonial will appear here after a quick review.
      </p>
      <div className="mt-6 flex justify-center">
        <ShareButton onClick={onShare} isSignedIn={isSignedIn} />
      </div>
    </motion.div>
  );
}
