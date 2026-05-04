const DEFAULT_BLOCKED = [
  "spam",
  "scam",
  "fake follower",
  "buy followers",
  "nsfw",
];

export function getBlockedWordList(): string[] {
  const raw = process.env.BLOCKED_WORDS_LIST?.trim();
  const fromEnv = raw
    ? raw
        .split(/[,\n]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];
  const set = new Set([...DEFAULT_BLOCKED, ...fromEnv]);
  return Array.from(set);
}

export function containsBlockedWord(text: string, words: string[]): string | null {
  const lower = text.toLowerCase();
  for (const w of words) {
    if (w.length === 0) {
      continue;
    }
    if (lower.includes(w)) {
      return w;
    }
  }
  return null;
}
