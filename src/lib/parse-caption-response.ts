import type { CaptionRatingKey } from "@/lib/caption-rating-styles";
import { parseLenientJson } from "@/lib/groq-json";

export type ParsedCaptionScore = {
  hook?: number;
  emotion?: number;
  cta?: number;
  platformFit?: number;
  originality?: number;
  explanation?: string;
};

export type ParsedCaptionResponse = {
  captions: string[];
  emojiPerCaption: string[][];
  captionRatings: CaptionRatingKey[];
  captionScores: (ParsedCaptionScore | null)[];
};

const RATING_SET = new Set<CaptionRatingKey>(["worst", "medium", "best"]);

function isRatingKey(v: string): v is CaptionRatingKey {
  return RATING_SET.has(v as CaptionRatingKey);
}

/**
 * Normalize the model's rating array to exactly `count` entries. For the
 * classic 3-caption case we still require one of each (best/medium/worst);
 * for the larger Pro (5) and Annual (7) sets we only require every entry to be
 * a valid rating with at least one "best" present.
 */
function normalizeCaptionRatings(
  raw: unknown,
  count: number
): CaptionRatingKey[] | null {
  if (!Array.isArray(raw) || raw.length !== count) {
    return null;
  }
  const labels = raw.map((x) => String(x).trim().toLowerCase());
  if (!labels.every(isRatingKey)) {
    return null;
  }
  const typed = labels as CaptionRatingKey[];

  if (count === 3) {
    const set = new Set(typed);
    if (set.size !== 3) return null;
    return typed;
  }

  if (!typed.includes("best")) {
    return null;
  }
  return typed;
}

/**
 * Deterministic fallback ratings for `count` captions: one "best", one
 * "worst" (when there is room), and the remainder "medium".
 */
export function defaultCaptionRatings(count = 3): CaptionRatingKey[] {
  if (count <= 1) return ["best"];
  if (count === 2) return ["best", "worst"];
  const ratings: CaptionRatingKey[] = new Array(count).fill("medium");
  ratings[0] = "best";
  ratings[count - 1] = "worst";
  return ratings;
}

function captionTextFromItem(item: unknown): string {
  if (typeof item === "string") {
    return item.trim();
  }
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    const v = o.caption ?? o.text ?? o.content ?? o.body;
    if (typeof v === "string") {
      return v.trim();
    }
  }
  return "";
}

function normalizeCaptions(raw: unknown, count: number): string[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const captions = raw.map(captionTextFromItem).filter(Boolean);
  // Always require at least 3 valid captions so a response is never empty; if
  // the model returns more than requested, trim to the plan's caption count.
  if (captions.length >= Math.min(count, 3)) {
    return captions.slice(0, count);
  }
  return null;
}

function normalizeEmojiPerCaption(raw: unknown, count: number): string[][] {
  const empty = () => Array.from({ length: count }, () => [] as string[]);
  if (!Array.isArray(raw) || raw.length === 0) {
    return empty();
  }
  const rows = raw.slice(0, count).map((row) => {
    if (Array.isArray(row)) {
      return row.map((e) => String(e).trim()).filter(Boolean);
    }
    if (typeof row === "string" && row.trim()) {
      return row.trim().split(/\s+/);
    }
    return [];
  });
  while (rows.length < count) {
    rows.push([]);
  }
  return rows;
}

type CaptionJsonShape = {
  captions?: unknown;
  emojiPerCaption?: unknown;
  captionRatings?: unknown;
  captionScores?: unknown;
};

function numberOrUndefined(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return undefined;
}

function normalizeCaptionScores(
  raw: unknown,
  count: number
): (ParsedCaptionScore | null)[] {
  if (!Array.isArray(raw)) return Array.from({ length: count }, () => null);
  const rows = raw.slice(0, count).map((row): ParsedCaptionScore | null => {
    if (!row || typeof row !== "object") return null;
    const r = row as Record<string, unknown>;
    const out: ParsedCaptionScore = {
      hook: numberOrUndefined(r.hook ?? r.hookStrength),
      emotion: numberOrUndefined(r.emotion ?? r.emotionalEngagement ?? r.emotional),
      cta: numberOrUndefined(r.cta ?? r.callToAction),
      platformFit: numberOrUndefined(r.platformFit ?? r.platform),
      originality: numberOrUndefined(r.originality ?? r.original),
      explanation:
        typeof r.explanation === "string"
          ? r.explanation.trim().slice(0, 200)
          : typeof r.reason === "string"
            ? r.reason.trim().slice(0, 200)
            : undefined,
    };
    return out;
  });
  while (rows.length < count) rows.push(null);
  return rows;
}

export function parseCaptionModelJson(
  raw: string,
  count = 3
): ParsedCaptionResponse | null {
  const parsed = parseLenientJson<CaptionJsonShape>(raw);
  if (!parsed) {
    return null;
  }

  const captions = normalizeCaptions(parsed.captions, count);
  if (!captions) {
    return null;
  }

  // Align all per-caption arrays to the actual number of captions returned.
  const actual = captions.length;
  const emojiPerCaption = normalizeEmojiPerCaption(parsed.emojiPerCaption, actual);
  const captionRatings =
    normalizeCaptionRatings(parsed.captionRatings, actual) ??
    defaultCaptionRatings(actual);
  const captionScores = normalizeCaptionScores(parsed.captionScores, actual);

  return { captions, emojiPerCaption, captionRatings, captionScores };
}
