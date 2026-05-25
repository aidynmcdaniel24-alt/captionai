"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const POLL_MS = 60_000;

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
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

export function LiveCaptionsCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/stats/captions", { cache: "no-store" });
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
  }, []);

  const animated = useAnimatedCount(count);
  const showFallback = loaded && (count ?? 0) < 100;

  return (
    <section
      aria-label="Live captions generated"
      className="px-4 pb-2 pt-0 sm:px-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="mx-auto flex max-w-3xl items-center justify-center"
      >
        <div className="inline-flex items-center gap-3 rounded-full border border-purple-300/60 bg-white/90 px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm shadow-purple-900/5 backdrop-blur sm:text-base dark:border-purple-500/30 dark:bg-zinc-900/70 dark:text-zinc-200">
          <span aria-hidden className="text-base sm:text-lg">🚀</span>
          {!loaded ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-purple-500" aria-hidden />
              <span className="text-zinc-500 dark:text-zinc-400">Loading caption counter…</span>
            </span>
          ) : showFallback ? (
            <span>
              <span className="font-semibold text-purple-700 dark:text-purple-300">
                Hundreds of captions
              </span>{" "}
              generated daily
            </span>
          ) : (
            <span>
              <span className="font-bold tabular-nums text-purple-700 dark:text-purple-300">
                {formatNumber(animated)}
              </span>{" "}
              captions generated and counting
            </span>
          )}
        </div>
      </motion.div>
    </section>
  );
}
