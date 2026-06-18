// Compute a 0-100 caption quality score from per-dimension subscores returned
// by the model, with a deterministic heuristic fallback that runs whenever the
// model omits scores or returns unparseable values.
//
// Buckets (max points):
//   hook 25, emotion 25, cta 20, platformFit 20, originality 10  → total 100

import type { CaptionRatingKey } from "@/lib/caption-rating-styles";

export type CaptionScoreBreakdown = {
  hook: number;
  emotion: number;
  cta: number;
  platformFit: number;
  originality: number;
};

export type CaptionScore = {
  total: number;
  breakdown: CaptionScoreBreakdown;
  explanation: string;
  band: "red" | "amber" | "green";
};

const MAX: CaptionScoreBreakdown = {
  hook: 25,
  emotion: 25,
  cta: 20,
  platformFit: 20,
  originality: 10,
};

function clampScore(value: unknown, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n), max);
}

export function bandForScore(total: number): "red" | "amber" | "green" {
  if (total <= 40) return "red";
  if (total <= 70) return "amber";
  return "green";
}

export function colorClassesForBand(band: "red" | "amber" | "green") {
  switch (band) {
    case "red":
      return {
        bar: "bg-red-500",
        track: "bg-red-100 dark:bg-red-950/40",
        text: "text-red-700 dark:text-red-300",
        chip:
          "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200",
      };
    case "amber":
      return {
        bar: "bg-amber-500",
        track: "bg-amber-100 dark:bg-amber-950/40",
        text: "text-amber-800 dark:text-amber-300",
        chip:
          "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200",
      };
    case "green":
    default:
      return {
        bar: "bg-emerald-500",
        track: "bg-emerald-100 dark:bg-emerald-950/40",
        text: "text-emerald-700 dark:text-emerald-300",
        chip:
          "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200",
      };
  }
}

// ─── Heuristic fallback ──────────────────────────────────────────────────────
// Cheap signals so we can always return a score even when the model omits one.

function firstLine(caption: string): string {
  return caption.trim().split(/\n+/)[0] ?? "";
}

const CLICHES = [
  "in a world where",
  "let's dive in",
  "buckle up",
  "game-changer",
  "game changer",
  "unlock your potential",
  "next level",
  "level up your",
  "synergy",
  "leverage",
  "transform your life",
  "smash that like",
  "comment below",
  "double tap if",
  "follow for more",
];

const HOOK_OPENERS = [
  "pov:",
  "tell me why",
  "not me",
  "this is your sign",
  "stop scrolling",
  "no one talks about",
  "wait for it",
  "the way i",
  "i was today years old",
  "everyone gets this wrong",
  "unpopular opinion",
  "hot take",
  "honestly,",
  "the truth is",
];

const CTA_PHRASES = [
  "?",
  "tell me",
  "drop a",
  "comment",
  "share",
  "tag",
  "save this",
  "let me know",
  "what's your",
  "double tap",
  "follow",
  "click",
  "join",
  "sign up",
  "try it",
  "rsvp",
];

const EMOTION_WORDS = [
  "love",
  "miss",
  "hate",
  "honestly",
  "scared",
  "proud",
  "tired",
  "grateful",
  "lonely",
  "happy",
  "broken",
  "real",
  "raw",
  "soft",
  "wild",
  "alive",
  "burned out",
  "saved",
  "remember",
  "always",
  "never",
  "today",
  "still",
  "finally",
];

function bodyWithoutHashtags(caption: string): string {
  return caption.replace(/#[\p{L}\p{N}_]+/gu, "").trim();
}

function platformLengthFit(caption: string, platform: string): number {
  const p = platform.trim().toLowerCase();
  const body = bodyWithoutHashtags(caption);
  const totalLen = caption.length;
  const bodyLen = body.length;
  const lines = body.split(/\n+/).filter(Boolean).length;
  const sentences = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
  const hashtagCount = (caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;
  const max = MAX.platformFit;

  let score = max;
  const penalize = (pts: number) => {
    score = Math.max(0, score - pts);
  };

  if (p.includes("twitter") || p === "x" || p.includes("x.com")) {
    if (totalLen > 280) penalize(8);
    if (hashtagCount > 1) penalize(6);
    if (sentences > 2) penalize(3);
  } else if (p.includes("tiktok")) {
    if (lines > 3) penalize(5);
    if (bodyLen > 180) penalize(5);
    if (hashtagCount < 2 || hashtagCount > 6) penalize(4);
  } else if (p.includes("insta")) {
    if (sentences < 2 || sentences > 7) penalize(6);
    if (hashtagCount < 6 || hashtagCount > 14) penalize(5);
    if (bodyLen < 100) penalize(3);
  } else if (p.includes("linkedin")) {
    const paragraphs = body.split(/\n{2,}/).filter(Boolean).length;
    if (paragraphs < 3 || paragraphs > 6) penalize(6);
    if (hashtagCount > 3) penalize(4);
    if (sentences < 3) penalize(3);
  } else if (p.includes("facebook")) {
    if (sentences < 1 || sentences > 5) penalize(4);
    if (hashtagCount > 4) penalize(3);
  } else if (p.includes("pinterest")) {
    if (sentences > 4) penalize(3);
    if (hashtagCount < 2 || hashtagCount > 7) penalize(3);
  } else if (p.includes("thread") || p.includes("bluesky") || p.includes("bsky")) {
    if (totalLen > 300) penalize(5);
    if (hashtagCount > 2) penalize(3);
  }

  return Math.max(0, Math.min(score, max));
}

function scoreHook(caption: string): number {
  const opener = firstLine(caption).toLowerCase();
  const trimmed = opener.replace(/^[^\p{L}\p{N}#]+/u, "");
  let score = 12;

  if (HOOK_OPENERS.some((h) => trimmed.startsWith(h))) score += 8;
  if (/[0-9]/.test(trimmed.slice(0, 30))) score += 3;
  if (trimmed.split(/\s+/).length <= 9) score += 3;
  if (/^(hey guys|hi everyone|hello|welcome to|in today|today i)/i.test(trimmed)) score -= 8;
  if (trimmed.length === 0) score -= 8;
  if (CLICHES.some((c) => trimmed.includes(c))) score -= 5;

  return Math.max(0, Math.min(score, MAX.hook));
}

function scoreEmotion(caption: string): number {
  const lower = bodyWithoutHashtags(caption).toLowerCase();
  if (!lower) return 0;
  const hits = EMOTION_WORDS.reduce(
    (acc, w) => acc + (lower.includes(w) ? 1 : 0),
    0
  );
  let score = 10 + Math.min(hits * 3, 10);
  if (/[!?]/.test(lower)) score += 2;
  if (/(i |my |me |we )/.test(lower)) score += 3;
  return Math.max(0, Math.min(score, MAX.emotion));
}

function scoreCta(caption: string): number {
  const body = bodyWithoutHashtags(caption).toLowerCase();
  if (!body) return 0;
  const lastChunk = body.slice(-180);
  let score = 4;
  for (const phrase of CTA_PHRASES) {
    if (lastChunk.includes(phrase)) {
      score += 5;
      break;
    }
  }
  if (/\?\s*$/.test(body) || /\?\s*[^\w]*$/.test(body)) score += 6;
  if (/(save this|tag a friend|tell me)/i.test(lastChunk)) score += 5;
  return Math.max(0, Math.min(score, MAX.cta));
}

function scoreOriginality(caption: string): number {
  const lower = bodyWithoutHashtags(caption).toLowerCase();
  if (!lower) return 0;
  const hits = CLICHES.reduce((acc, c) => acc + (lower.includes(c) ? 1 : 0), 0);
  let score = MAX.originality;
  score -= Math.min(hits * 4, MAX.originality);
  return Math.max(0, score);
}

export function heuristicScore(caption: string, platform: string): CaptionScoreBreakdown {
  return {
    hook: scoreHook(caption),
    emotion: scoreEmotion(caption),
    cta: scoreCta(caption),
    platformFit: platformLengthFit(caption, platform),
    originality: scoreOriginality(caption),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type RawScoreInput = Partial<CaptionScoreBreakdown> & {
  total?: number;
  explanation?: string;
};

function summarizeBreakdown(b: CaptionScoreBreakdown): string {
  // Pick the strongest and weakest dimensions and build a "Strong X but weak Y"
  // style one-liner.
  const pct = {
    hook: b.hook / MAX.hook,
    emotion: b.emotion / MAX.emotion,
    cta: b.cta / MAX.cta,
    platformFit: b.platformFit / MAX.platformFit,
    originality: b.originality / MAX.originality,
  };

  const labels: Record<keyof CaptionScoreBreakdown, { strong: string; weak: string }> = {
    hook: { strong: "strong hook", weak: "weak hook" },
    emotion: { strong: "real emotional pull", weak: "flat emotional pull" },
    cta: { strong: "clear CTA", weak: "missing CTA" },
    platformFit: { strong: "great platform fit", weak: "off-platform length" },
    originality: { strong: "fresh angle", weak: "leans on clichés" },
  };

  const entries = Object.entries(pct) as [keyof CaptionScoreBreakdown, number][];
  const sorted = entries.slice().sort((a, b) => b[1] - a[1]);
  const top = sorted[0]!;
  const bottom = sorted[sorted.length - 1]!;

  if (top[1] >= 0.8 && bottom[1] <= 0.5) {
    return `Strong ${labels[top[0]].strong}, but ${labels[bottom[0]].weak}.`;
  }
  if (top[1] >= 0.8) {
    return `Standout ${labels[top[0]].strong}; the rest is solid.`;
  }
  if (bottom[1] <= 0.3) {
    return `Tighten the ${labels[bottom[0]].weak} for a bigger lift.`;
  }
  if (top[1] >= 0.6) {
    return `Solid ${labels[top[0]].strong}; a bit more ${labels[bottom[0]].weak.replace(/^missing |^weak |^flat |^off-platform /, "")} would push it higher.`;
  }
  return "Decent baseline — sharpen the hook and CTA to climb higher.";
}

function mergeBreakdown(
  fromModel: RawScoreInput | undefined,
  heuristic: CaptionScoreBreakdown
): CaptionScoreBreakdown {
  if (!fromModel) return heuristic;
  return {
    hook: typeof fromModel.hook === "number" ? clampScore(fromModel.hook, MAX.hook) : heuristic.hook,
    emotion:
      typeof fromModel.emotion === "number"
        ? clampScore(fromModel.emotion, MAX.emotion)
        : heuristic.emotion,
    cta: typeof fromModel.cta === "number" ? clampScore(fromModel.cta, MAX.cta) : heuristic.cta,
    platformFit:
      typeof fromModel.platformFit === "number"
        ? clampScore(fromModel.platformFit, MAX.platformFit)
        : heuristic.platformFit,
    originality:
      typeof fromModel.originality === "number"
        ? clampScore(fromModel.originality, MAX.originality)
        : heuristic.originality,
  };
}

export function computeCaptionScore(
  caption: string,
  platform: string,
  fromModel?: RawScoreInput | null
): CaptionScore {
  const heuristic = heuristicScore(caption, platform);
  const breakdown = mergeBreakdown(fromModel ?? undefined, heuristic);
  const total = clampScore(
    breakdown.hook +
      breakdown.emotion +
      breakdown.cta +
      breakdown.platformFit +
      breakdown.originality,
    100
  );
  const band = bandForScore(total);
  const explanation =
    (fromModel?.explanation && String(fromModel.explanation).trim().slice(0, 140)) ||
    summarizeBreakdown(breakdown);
  return { total, breakdown, explanation, band };
}

export function computeCaptionScores(
  captions: string[],
  platform: string,
  modelScores?: (RawScoreInput | null | undefined)[] | null
): CaptionScore[] {
  return captions.map((cap, i) => computeCaptionScore(cap, platform, modelScores?.[i] ?? null));
}

/**
 * Derive Best/Medium/Worst labels directly from the numeric scores so the label
 * can never disagree with the score the user sees. The single highest-scoring
 * caption is "best", the single lowest is "worst", and everything in between is
 * "medium". Ties are broken by original order (earlier caption wins the higher
 * rank), keeping the assignment deterministic.
 */
export function deriveCaptionRatingsFromScores(
  scores: CaptionScore[]
): CaptionRatingKey[] {
  const n = scores.length;
  if (n === 0) return [];
  if (n === 1) return ["best"];

  const order = scores
    .map((s, i) => ({ i, total: s.total }))
    .sort((a, b) => b.total - a.total || a.i - b.i);

  const ratings: CaptionRatingKey[] = new Array(n).fill("medium");
  ratings[order[0]!.i] = "best";
  ratings[order[n - 1]!.i] = "worst";
  return ratings;
}
