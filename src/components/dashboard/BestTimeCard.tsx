"use client";

import { useEffect, useMemo, useState } from "react";

const TIPS: Record<string, string> = {
  Instagram: "Weekdays 10am–2pm & 7pm–9pm (your audience’s timezone). Reels often spike early evening.",
  TikTok: "Evenings 6pm–10pm and lunch 12pm–2pm — test Tue–Thu for consistency.",
  "Twitter/X": "Weekday mornings 8–10am and lunch; breaking topics anytime.",
  LinkedIn: "Tuesday–Thursday 9–11am — professional tone peaks mid-morning.",
  Default: "Post when your audience is awake — experiment for a week and compare saves/clicks.",
};

function resolvePlatformKey(platform: string): string {
  const p = platform.trim();
  if (p in TIPS && p !== "Default") {
    return p;
  }
  const match = Object.keys(TIPS).find((k) => p.toLowerCase().includes(k.toLowerCase()));
  return match ?? "Default";
}

function fallbackTip(platform: string): string {
  const key = resolvePlatformKey(platform);
  return TIPS[key] ?? TIPS.Default;
}

const DEBOUNCE_MS = 500;

export function BestTimeCard({ platform, topic = "" }: { platform: string; topic?: string }) {
  const trimmedTopic = topic.trim();
  const [aiText, setAiText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usedAi, setUsedAi] = useState(false);

  const displayPlatform = platform.trim() || "Instagram";

  const staticText = useMemo(() => fallbackTip(displayPlatform), [displayPlatform]);

  useEffect(() => {
    if (!trimmedTopic) {
      setAiText(null);
      setLoading(false);
      setUsedAi(false);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setUsedAi(false);
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/tools/best-time", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic: trimmedTopic, platform: displayPlatform }),
            signal: ac.signal,
          });
          const data = (await res.json()) as { bestTime?: string; error?: string };
          if (ac.signal.aborted) {
            return;
          }
          if (res.ok && data.bestTime) {
            setAiText(data.bestTime);
            setUsedAi(true);
          } else {
            setAiText(null);
            setUsedAi(false);
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") {
            return;
          }
          if (!ac.signal.aborted) {
            setAiText(null);
            setUsedAi(false);
          }
        } finally {
          if (!ac.signal.aborted) {
            setLoading(false);
          }
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [trimmedTopic, displayPlatform]);

  const text =
    trimmedTopic && loading
      ? "Analyzing your topic…"
      : trimmedTopic && aiText
        ? aiText
        : staticText;

  const footnote = usedAi && aiText
    ? "Suggested from your topic with AI — pair with your analytics for best results."
    : "Heuristic guide — pair with your analytics for best results.";

  return (
    <div className="rounded-2xl border border-purple-500/25 bg-purple-950/20 p-4 dark:border-purple-500/25 dark:bg-purple-950/20">
      <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-300">
        Best time to post
      </p>
      <p
        className={`mt-2 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 ${trimmedTopic && loading ? "animate-pulse" : ""}`}
      >
        {text}
      </p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">{footnote}</p>
    </div>
  );
}
