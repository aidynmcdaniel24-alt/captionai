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

function normalizeCaptionRatings(raw: unknown): CaptionRatingKey[] | null {
  if (!Array.isArray(raw) || raw.length !== 3) {
    return null;
  }
  const labels = raw.map((x) => String(x).trim().toLowerCase()) as CaptionRatingKey[];
  const set = new Set(labels);
  if (set.size !== 3) {
    return null;
  }
  for (const r of RATING_SET) {
    if (!set.has(r)) {
      return null;
    }
  }
  return labels;
}

export function defaultCaptionRatings(): CaptionRatingKey[] {
  return ["medium", "worst", "best"];
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

function normalizeCaptions(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const captions = raw.map(captionTextFromItem).filter(Boolean);
  if (captions.length >= 3) {
    return captions.slice(0, 3);
  }
  return null;
}

function normalizeEmojiPerCaption(raw: unknown): string[][] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [[], [], []];
  }
  const rows = raw.slice(0, 3).map((row) => {
    if (Array.isArray(row)) {
      return row.map((e) => String(e).trim()).filter(Boolean);
    }
    if (typeof row === "string" && row.trim()) {
      return row.trim().split(/\s+/);
    }
    return [];
  });
  while (rows.length < 3) {
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

function normalizeCaptionScores(raw: unknown): (ParsedCaptionScore | null)[] {
  if (!Array.isArray(raw)) return [null, null, null];
  const rows = raw.slice(0, 3).map((row): ParsedCaptionScore | null => {
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
  while (rows.length < 3) rows.push(null);
  return rows;
}

export function parseCaptionModelJson(raw: string): ParsedCaptionResponse | null {
  const parsed = parseLenientJson<CaptionJsonShape>(raw);
  if (!parsed) {
    return null;
  }

  const captions = normalizeCaptions(parsed.captions);
  if (!captions) {
    return null;
  }

  const emojiPerCaption = normalizeEmojiPerCaption(parsed.emojiPerCaption);
  const captionRatings = normalizeCaptionRatings(parsed.captionRatings) ?? defaultCaptionRatings();
  const captionScores = normalizeCaptionScores(parsed.captionScores);

  return { captions, emojiPerCaption, captionRatings, captionScores };
}
