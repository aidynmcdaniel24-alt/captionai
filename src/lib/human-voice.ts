// Shared "human voice" rules so the Rewriter and Grader tools sound like a real
// person instead of ad copy — the same bar the main caption generator holds.
// Includes a prompt block to steer the model and a deterministic post-processor
// that hard-caps exclamation marks (the model cannot reliably self-limit them).

export const MARKETING_SPEAK_PHRASES = [
  "Introducing",
  "packed with",
  "Check out",
  "Don't miss",
  "Get ready",
  "Tired of",
  "fall flat",
] as const;

export const HUMAN_VOICE_RULES = `HUMAN VOICE RULES — write like a real person, never like an ad:
- MAX ONE exclamation mark in the ENTIRE output. Prefer periods. Let the words carry the energy, not the punctuation.
- BANNED marketing-speak — never use these or close variants: "Introducing", "packed with", "Check out", "Don't miss", "Get ready", "Tired of", "fall flat". Also avoid hype filler like "game-changer", "level up", "elevate", "unlock", "transform your life".
- Casual and human: use contractions, natural rhythm, the occasional fragment. If a line reads like a press release or ChatGPT, rewrite it.
- Genuinely punchier and clearer — sharper hook, tighter lines, concrete specifics. Make it BETTER, not just louder or more enthusiastic.`;

// Hard-cap exclamation marks at `max` (default 1). The model often ignores the
// instruction, so we enforce it after the fact: keep the first `max` "!" and
// turn the rest into periods, then clean up any artifacts.
export function limitExclamations(text: string, max = 1): string {
  if (!text) return text;
  // Collapse stacked marks ("!!", "?!") to a single "!" so each counts once.
  let out = text.replace(/!+/g, "!");
  let count = 0;
  out = out.replace(/!/g, () => (++count <= max ? "!" : "."));
  // Tidy up periods we may have introduced mid-text.
  out = out.replace(/\.{2,}/g, ".").replace(/[ \t]+\./g, ".");
  return out;
}
