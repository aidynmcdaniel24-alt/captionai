/**
 * Data-driven best-time-to-post recommendations.
 *
 * These windows come from publicly published engagement research (Later,
 * Sprout Social, Hootsuite, Buffer 2024-2025 datasets). They power both the AI
 * prompts (so suggestions are grounded in real data, not guessed) and the
 * deterministic fallbacks shown in the UI when AI is unavailable.
 */

export type PlatformBestTime = {
  /** Canonical platform label. */
  platform: string;
  /** Short badge-friendly window, e.g. "Tue & Wed 9–11am". */
  badge: string;
  /** Full human windows for the card view. */
  windows: string[];
  /** Why these windows work — shown to the user. */
  reason: string;
};

export const PLATFORM_BEST_TIMES: Record<string, PlatformBestTime> = {
  instagram: {
    platform: "Instagram",
    badge: "Tue, Wed & Fri 9–11am",
    windows: ["Tuesday, Wednesday & Friday 9am–11am", "Daily 2pm–3pm"],
    reason:
      "Instagram engagement peaks on Tuesday, Wednesday and Friday mornings and again mid-afternoon, according to Later and Sprout Social research.",
  },
  tiktok: {
    platform: "TikTok",
    badge: "Tue 7–9pm · Thu 8–10pm",
    windows: ["Tuesday 7pm–9pm", "Thursday 8pm–10pm", "Friday 5pm–6pm"],
    reason:
      "TikTok views spike in the evening — strongest on Tuesday and Thursday nights and Friday early evening — when users wind down and scroll.",
  },
  linkedin: {
    platform: "LinkedIn",
    badge: "Tue–Thu 8–11am",
    windows: ["Tuesday, Wednesday & Thursday 8am–11am", "Tuesday–Thursday 12pm–1pm"],
    reason:
      "LinkedIn performs best during mid-week business hours — Tuesday through Thursday mornings and the lunch hour — when professionals are active.",
  },
  "twitter/x": {
    platform: "Twitter/X",
    badge: "Weekdays 8–10am & 6–9pm",
    windows: ["Monday–Friday 8am–10am", "Monday–Friday 6pm–9pm"],
    reason:
      "Twitter/X engagement is highest during the weekday morning commute and the evening wind-down window.",
  },
  facebook: {
    platform: "Facebook",
    badge: "Wed 11am–1pm · Fri 1–3pm",
    windows: ["Wednesday 11am–1pm", "Friday 1pm–3pm"],
    reason:
      "Facebook reach peaks midday on Wednesday and early afternoon on Friday, when scrolling during breaks is highest.",
  },
  youtube: {
    platform: "YouTube",
    badge: "Thu & Fri 3–5pm · Sat 9–11am",
    windows: ["Thursday & Friday 3pm–5pm", "Saturday 9am–11am"],
    reason:
      "YouTube watch time builds heading into the weekend — late Thursday/Friday afternoons and Saturday mornings — when viewers have time for longer content.",
  },
};

const ALIASES: Record<string, string> = {
  insta: "instagram",
  ig: "instagram",
  tiktok: "tiktok",
  tt: "tiktok",
  linkedin: "linkedin",
  twitter: "twitter/x",
  x: "twitter/x",
  "twitter/x": "twitter/x",
  fb: "facebook",
  facebook: "facebook",
  youtube: "youtube",
  yt: "youtube",
};

/** Resolve a free-text platform name to a best-time profile (or null). */
export function bestTimeForPlatform(platform: string): PlatformBestTime | null {
  const key = platform.trim().toLowerCase();
  if (PLATFORM_BEST_TIMES[key]) return PLATFORM_BEST_TIMES[key]!;
  if (ALIASES[key] && PLATFORM_BEST_TIMES[ALIASES[key]!]) {
    return PLATFORM_BEST_TIMES[ALIASES[key]!]!;
  }
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (key.includes(alias)) return PLATFORM_BEST_TIMES[canonical] ?? null;
  }
  return null;
}

/**
 * A compact reference block of every platform's research-backed windows,
 * suitable for embedding inside an AI prompt so suggestions stay grounded.
 */
export function bestTimeResearchBlock(): string {
  return Object.values(PLATFORM_BEST_TIMES)
    .map((p) => `- ${p.platform}: ${p.windows.join("; ")}. ${p.reason}`)
    .join("\n");
}

/** Convert generation-hour buckets (24-length array, UTC) to a readable label. */
export function personalBestHourLabel(
  hourBuckets: number[] | null | undefined
): string | null {
  if (!Array.isArray(hourBuckets) || hourBuckets.length === 0) return null;
  let bestIdx = -1;
  let bestVal = 0;
  hourBuckets.forEach((v, i) => {
    if (v > bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  });
  if (bestIdx < 0 || bestVal === 0) return null;
  const hr = bestIdx % 24;
  const ampm = hr < 12 ? "am" : "pm";
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return `${display}${ampm}`;
}
