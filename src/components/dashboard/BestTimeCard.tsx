"use client";

import { bestTimeForPlatform } from "@/lib/best-time-data";
import { useEffect, useMemo, useState } from "react";

const DEBOUNCE_MS = 500;

type PersonalData = {
  windows: string[];
  reason: string | null;
  badge: string | null;
  hasEnoughHistory: boolean;
  personalBestHour: string | null;
};

export function BestTimeCard({ platform, topic = "" }: { platform: string; topic?: string }) {
  const trimmedTopic = topic.trim();
  const [aiText, setAiText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usedAi, setUsedAi] = useState(false);
  const [personal, setPersonal] = useState<PersonalData | null>(null);

  const displayPlatform = platform.trim() || "Instagram";

  // Research-backed window for this platform (data-driven, all users).
  const research = useMemo(() => bestTimeForPlatform(displayPlatform), [displayPlatform]);

  // Pull the user's personal posting patterns (10+ captions) for this platform.
  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/tools/personal-best-time?platform=${encodeURIComponent(displayPlatform)}`,
          { signal: ac.signal }
        );
        if (!res.ok || ac.signal.aborted) return;
        const data = (await res.json()) as PersonalData;
        if (!ac.signal.aborted) setPersonal(data);
      } catch {
        /* ignore */
      }
    })();
    return () => ac.abort();
  }, [displayPlatform]);

  // Optional AI refinement based on the topic.
  useEffect(() => {
    if (!trimmedTopic) {
      setAiText(null);
      setUsedAi(false);
      return;
    }

    const ac = new AbortController();
    const t = window.setTimeout(() => {
      setLoading(true);
      setUsedAi(false);
      void (async () => {
        try {
          const res = await fetch("/api/tools/best-time", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic: trimmedTopic, platform: displayPlatform }),
            signal: ac.signal,
          });
          const data = (await res.json()) as { bestTime?: string; error?: string };
          if (ac.signal.aborted) return;
          if (res.ok && data.bestTime) {
            setAiText(data.bestTime);
            setUsedAi(true);
          } else {
            setAiText(null);
            setUsedAi(false);
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          if (!ac.signal.aborted) {
            setAiText(null);
            setUsedAi(false);
          }
        } finally {
          if (!ac.signal.aborted) setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [trimmedTopic, displayPlatform]);

  const windows = personal?.windows?.length ? personal.windows : research?.windows ?? [];
  const reason = personal?.reason ?? research?.reason ?? null;
  const personalLine =
    personal?.hasEnoughHistory && personal.personalBestHour
      ? `Based on your posting patterns and ${displayPlatform} data, around ${personal.personalBestHour} works best for you — pair it with the peak days above.`
      : null;

  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-500/25 dark:bg-purple-950/20">
      <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
        Best time to post · {displayPlatform}
      </p>

      {windows.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {windows.map((w) => (
            <li
              key={w}
              className="flex items-start gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              <span aria-hidden>⏰</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          Post when your audience is awake — test for a week and compare saves/clicks.
        </p>
      )}

      {reason ? (
        <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{reason}</p>
      ) : null}

      {personalLine ? (
        <p className="mt-3 rounded-lg border border-purple-300/60 bg-white/60 px-3 py-2 text-xs font-medium text-purple-900 dark:border-purple-500/30 dark:bg-purple-950/40 dark:text-purple-100">
          <span aria-hidden>📊 </span>
          {personalLine}
        </p>
      ) : null}

      {trimmedTopic ? (
        <p
          className={`mt-3 border-t border-purple-200/70 pt-3 text-sm leading-relaxed text-zinc-700 dark:border-purple-500/20 dark:text-zinc-300 ${
            loading ? "animate-pulse" : ""
          }`}
        >
          {loading
            ? "Analyzing your topic…"
            : usedAi && aiText
              ? aiText
              : "Add a topic to get an AI-refined window for your specific content."}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        Source: Later &amp; Sprout Social engagement research{usedAi ? " + AI topic analysis" : ""}.
      </p>
    </div>
  );
}
