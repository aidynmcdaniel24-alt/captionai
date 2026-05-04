"use client";

const TIPS: Record<string, string> = {
  Instagram: "Weekdays 10am–2pm & 7pm–9pm (your audience’s timezone). Reels often spike early evening.",
  TikTok: "Evenings 6pm–10pm and lunch 12pm–2pm — test Tue–Thu for consistency.",
  "Twitter/X": "Weekday mornings 8–10am and lunch; breaking topics anytime.",
  LinkedIn: "Tuesday–Thursday 9–11am — professional tone peaks mid-morning.",
  Default: "Post when your audience is awake — experiment for a week and compare saves/clicks.",
};

export function BestTimeCard({ platform }: { platform: string }) {
  const key =
    platform in TIPS && platform !== "Default"
      ? platform
      : Object.keys(TIPS).find((k) => platform.toLowerCase().includes(k.toLowerCase())) ?? "Default";

  const text = TIPS[key] ?? TIPS.Default;

  return (
    <div className="rounded-2xl border border-purple-500/25 bg-purple-950/20 p-4 dark:border-purple-500/25 dark:bg-purple-950/20">
      <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-300">
        Best time to post
      </p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">{text}</p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        Heuristic guide — pair with your analytics for best results.
      </p>
    </div>
  );
}
