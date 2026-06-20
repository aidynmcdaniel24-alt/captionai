// Hashtag cleanup shared across the hashtag tool, caption generator, and bio
// tool. Two entry points:
//   - sanitizeHashtag / sanitizeHashtagList: for ARRAYS where each element is a
//     single intended hashtag, so any internal whitespace is part of a broken
//     tag and must be removed ("#SmallTown Charm" → "#SmallTownCharm").
//   - sanitizeHashtagsInText: for FREE TEXT (captions, bios) where a following
//     word may be normal prose, so we only do the unambiguously-safe fixes:
//     glue "# tag" → "#tag" and strip underscores ("#fall_events" → "#fallevents").

// Clean a single string that is KNOWN to be one hashtag. Strips the leading
// "#", removes every space and underscore, drops anything that isn't a letter
// or number (emoji, punctuation), then re-adds a single "#".
export function sanitizeHashtag(raw: string): string {
  const cleaned = String(raw ?? "")
    .replace(/^[\s#]+/, "")
    .replace(/[\s_]+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
  return cleaned ? `#${cleaned}` : "";
}

// Clean an array of hashtags (each element = one tag). Removes empties and
// case-insensitive duplicates while preserving order.
export function sanitizeHashtagList(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const clean = sanitizeHashtag(tag);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

// Clean hashtags that live inside free-flowing text. Only the safe transforms:
// remove the space directly after a "#" and strip underscores inside the tag.
// We deliberately do NOT merge following capitalized words here because in prose
// they are usually normal sentence words, not part of the tag.
export function sanitizeHashtagsInText(text: string): string {
  if (!text) return text;
  return text.replace(
    /#[ \t]*([\p{L}\p{N}_]+)/gu,
    (_match, tag: string) => `#${tag.replace(/_+/g, "")}`
  );
}
