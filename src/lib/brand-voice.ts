export const BRAND_PERSONALITIES = [
  "Bold",
  "Playful",
  "Professional",
  "Luxury",
  "Edgy",
  "Minimal",
  "Friendly",
  "Authoritative",
] as const;

export type BrandPersonality = (typeof BRAND_PERSONALITIES)[number];

export type BrandVoice = {
  brandName: string;
  description: string;
  personality: BrandPersonality[];
  wordsToUse: string;
  wordsToAvoid: string;
  exampleCaption: string;
};

export type BrandVoiceRow = {
  user_id: string;
  brand_name: string;
  description: string;
  personality: string[];
  words_to_use: string;
  words_to_avoid: string;
  example_caption: string;
  updated_at?: string;
};

export function isBrandVoiceConfigured(voice: BrandVoice | null | undefined): boolean {
  if (!voice) return false;
  return Boolean(
    voice.brandName.trim() ||
      voice.description.trim() ||
      voice.personality.length > 0 ||
      voice.wordsToUse.trim() ||
      voice.wordsToAvoid.trim() ||
      voice.exampleCaption.trim()
  );
}

export function normalizePersonality(input: unknown): BrandPersonality[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set<string>(BRAND_PERSONALITIES);
  const seen = new Set<string>();
  const out: BrandPersonality[] = [];
  for (const raw of input) {
    const value = String(raw ?? "").trim();
    if (allowed.has(value) && !seen.has(value)) {
      seen.add(value);
      out.push(value as BrandPersonality);
    }
  }
  return out;
}

export function rowToBrandVoice(row: BrandVoiceRow | null | undefined): BrandVoice | null {
  if (!row) return null;
  return {
    brandName: row.brand_name ?? "",
    description: row.description ?? "",
    personality: normalizePersonality(row.personality),
    wordsToUse: row.words_to_use ?? "",
    wordsToAvoid: row.words_to_avoid ?? "",
    exampleCaption: row.example_caption ?? "",
  };
}

export function brandVoicePromptSection(voice: BrandVoice | null | undefined): string {
  if (!isBrandVoiceConfigured(voice)) return "";
  const v = voice!;
  const lines: string[] = [];
  lines.push(`BRAND VOICE (these MUST shape every caption — match the brand's style exactly):`);
  if (v.brandName.trim()) lines.push(`  • Brand name: ${v.brandName.trim()}`);
  if (v.description.trim()) lines.push(`  • What the brand does: ${v.description.trim()}`);
  if (v.personality.length > 0) {
    lines.push(`  • Brand personality: ${v.personality.join(", ")}`);
  }
  if (v.wordsToUse.trim()) {
    lines.push(`  • Words / phrases the brand ALWAYS uses (work these in naturally): ${v.wordsToUse.trim()}`);
  }
  if (v.wordsToAvoid.trim()) {
    lines.push(`  • Words / phrases the brand NEVER uses (do not write these, ever): ${v.wordsToAvoid.trim()}`);
  }
  if (v.exampleCaption.trim()) {
    lines.push(`  • Example caption the brand loves (match this tone, rhythm, and vocabulary):`);
    lines.push(`    """${v.exampleCaption.trim()}"""`);
  }
  lines.push(
    `BRAND VOICE OVERRIDES PLATFORM TONE WHERE THEY CONFLICT. The captions must sound like this brand wrote them — not a generic caption.`
  );
  return lines.join("\n");
}
