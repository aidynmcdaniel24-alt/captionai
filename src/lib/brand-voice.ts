import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Brand Tone Profiles (Annual feature). A user saves their brand voice once and
 * it is automatically applied to every caption generation.
 *
 * Everything here is defensive: if the `brand_voice` table does not exist yet,
 * or a read fails for any reason, we return null/empty so caption generation
 * never breaks. (A previous attempt at this feature failed because a missing
 * table threw and took down generation — this version swallows those errors.)
 */

export type BrandVoice = {
  brandName: string;
  personality: string[];
  wordsToUse: string[];
  wordsToAvoid: string[];
  exampleCaption: string;
};

type BrandVoiceRow = {
  brand_name: string | null;
  personality: unknown;
  words_to_use: unknown;
  words_to_avoid: unknown;
  example_caption: string | null;
};

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function rowToBrandVoice(row: BrandVoiceRow | null): BrandVoice | null {
  if (!row) return null;
  const brandName = (row.brand_name ?? "").trim();
  const personality = toStringArray(row.personality);
  const wordsToUse = toStringArray(row.words_to_use);
  const wordsToAvoid = toStringArray(row.words_to_avoid);
  const exampleCaption = (row.example_caption ?? "").trim();

  // Consider the profile "set" only if at least one meaningful field exists.
  if (
    !brandName &&
    personality.length === 0 &&
    wordsToUse.length === 0 &&
    wordsToAvoid.length === 0 &&
    !exampleCaption
  ) {
    return null;
  }

  return { brandName, personality, wordsToUse, wordsToAvoid, exampleCaption };
}

/** Read a user's saved brand voice. Returns null if unset or unavailable. */
export async function getBrandVoice(userId: string): Promise<BrandVoice | null> {
  try {
    const { data, error } = await supabaseServer
      .from("brand_voice")
      .select("brand_name, personality, words_to_use, words_to_avoid, example_caption")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[brand-voice] read failed:", error.message);
      return null;
    }
    return rowToBrandVoice((data as BrandVoiceRow) ?? null);
  } catch (e) {
    console.warn(
      "[brand-voice] read threw:",
      e instanceof Error ? e.message : "unknown"
    );
    return null;
  }
}

/** Build a prompt fragment instructing the model to honor the brand voice. */
export function brandVoicePromptBlock(voice: BrandVoice): string {
  const lines: string[] = [
    "BRAND VOICE — the user has a saved brand tone profile. Every caption MUST sound like it came from this brand:",
  ];
  if (voice.brandName) lines.push(`- Brand name: ${voice.brandName}`);
  if (voice.personality.length > 0) {
    lines.push(`- Brand personality: ${voice.personality.join(", ")}. Let these traits shape the rhythm, word choice, and attitude of every caption.`);
  }
  if (voice.wordsToUse.length > 0) {
    lines.push(`- Words/phrases to favor (use naturally where they fit, never forced): ${voice.wordsToUse.join(", ")}.`);
  }
  if (voice.wordsToAvoid.length > 0) {
    lines.push(`- Words/phrases to NEVER use: ${voice.wordsToAvoid.join(", ")}. If any appear in a draft, rewrite to remove them.`);
  }
  if (voice.exampleCaption) {
    lines.push(`- A caption the brand loves (match this voice, tone, and energy — do NOT copy it): "${voice.exampleCaption.slice(0, 600)}"`);
  }
  lines.push("Apply this brand voice consistently while still respecting every platform rule above.");
  return lines.join("\n");
}
