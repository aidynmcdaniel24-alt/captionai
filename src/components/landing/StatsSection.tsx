"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const POLL_MS = 60_000;
const MIN_DISPLAY = 10;

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function formatStat(n: number | null): string {
  if (n == null) return "—";
  if (n < MIN_DISPLAY) return `${MIN_DISPLAY}+`;
  return `${formatNumber(n)}+`;
}

function useAnimatedCount(target: number | null, durationMs = 900) {
  const [value, setValue] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    if (target == null) return;
    const start = previous.current;
    const delta = target - start;
    if (delta === 0) {
      setValue(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(start + delta * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        previous.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

function useLiveCount(endpoint: string) {
  const [count, setCount] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        if (cancelled) return;
        setCount(typeof data.count === "number" ? data.count : 0);
        setLoaded(true);
      } catch {
        if (!cancelled) {
          setCount(0);
          setLoaded(true);
        }
      }
    }
    void load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [endpoint]);

  return { count, loaded };
}

export function StatsSection() {
  const { count: usersCount, loaded: usersLoaded } = useLiveCount(
    "/api/stats/users"
  );
  const { count: captionsCount, loaded: captionsLoaded } = useLiveCount(
    "/api/stats/captions"
  );

  // Only animate once we have a real target so we don't briefly flash "0".
  const animatedUsers = useAnimatedCount(usersLoaded ? usersCount : null);
  const animatedCaptions = useAnimatedCount(
    captionsLoaded ? captionsCount : null
  );

  // For animation we want raw numbers, but display passes through formatStat
  // so the "10+" floor still applies during/after the count-up.
  const usersDisplay = usersLoaded ? formatStat(animatedUsers) : "…";
  const captionsDisplay = captionsLoaded ? formatStat(animatedCaptions) : "…";

  const stats: Array<{ label: string; value: string; live: boolean }> = [
    { label: "Creators", value: usersDisplay, live: usersLoaded },
    { label: "Captions Generated", value: captionsDisplay, live: captionsLoaded },
    { label: "Rating", value: "4.9/5", live: true },
  ];

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
        {stats.map((stat) => (
          <li key={stat.label} className="text-center">
            <p
              aria-live={stat.live ? "polite" : undefined}
              className="text-xl font-bold tabular-nums tracking-tight text-purple-700 sm:text-3xl dark:text-purple-300"
            >
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
