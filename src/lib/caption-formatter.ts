// Cleans AI-generated captions so they feel polished and ready-to-post:
// fixes spacing, normalizes punctuation, balances quotes/parens, removes the
// random ALL CAPS words the model sometimes injects, dedupes stray emoji and
// gives them a consistent spacing, and only ever capitalizes sentence starts.
//
// We deliberately preserve hashtags, intentional hashtag blocks, line breaks
// the model used for paragraphing, and any emoji that genuinely belong to the
// caption. The goal is "ready to post with zero editing", not "rewritten".

const SMART_QUOTE_MAP: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": "'",
  "\u201B": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u201F": '"',
  "\u2032": "'",
  "\u2033": '"',
};

// Common acronyms/brand names that should stay uppercase even when our
// "no random ALL CAPS" rule fires.
const ALLOWED_ALL_CAPS = new Set([
  "AI",
  "API",
  "APP",
  "APR",
  "ASAP",
  "ATL",
  "BTS",
  "CEO",
  "CFO",
  "CTA",
  "CTO",
  "DIY",
  "DM",
  "DMS",
  "EDM",
  "EU",
  "FAQ",
  "FBI",
  "FYI",
  "GDP",
  "GIF",
  "GMT",
  "GPS",
  "GPT",
  "HR",
  "HQ",
  "HTML",
  "HTTP",
  "HTTPS",
  "ID",
  "IDK",
  "IG",
  "IMO",
  "IPO",
  "IRL",
  "IT",
  "JSON",
  "JS",
  "LA",
  "LED",
  "LGBTQ",
  "LOL",
  "MBA",
  "MVP",
  "NASA",
  "NBA",
  "NFL",
  "NFT",
  "NGO",
  "NSFW",
  "NY",
  "NYC",
  "OK",
  "OOTD",
  "PDF",
  "PM",
  "POV",
  "PR",
  "PS",
  "QA",
  "ROI",
  "RSVP",
  "SEO",
  "SF",
  "SMS",
  "SUV",
  "TBH",
  "TBT",
  "TGIF",
  "TIA",
  "TLDR",
  "TV",
  "UI",
  "UK",
  "URL",
  "US",
  "USA",
  "USD",
  "UX",
  "VIP",
  "VP",
  "WIP",
  "WTF",
  "XOXO",
  "YOLO",
  "YT",
]);

// Tag/handle/URL/numeric/punctuation-only tokens we never rewrite.
const TOKEN_SKIP_REGEX =
  /^(?:#|@|https?:\/\/|www\.|\$\d|\d+%|\d+x|\d+k|\d+m|\d+\.?\d*)$/i;

function normalizeWhitespaceAndUnicode(input: string): string {
  let text = input;
  // Strip BOM and zero-width characters that occasionally sneak in from the model.
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");
  // Normalize non-breaking + thin spaces to regular spaces (but keep \n).
  text = text.replace(/[\u00A0\u2007\u202F\u2009\u200A\u2002\u2003\u205F]/g, " ");
  // Smart quotes → straight quotes.
  for (const [smart, plain] of Object.entries(SMART_QUOTE_MAP)) {
    text = text.split(smart).join(plain);
  }
  // Em/en dashes → consistent em dash with single spaces around it
  // (only when the model put spaces around them — preserve word-joining cases).
  text = text.replace(/\s*\u2014\s*/g, " — ");
  text = text.replace(/\s+-\s+/g, " — ");
  text = text.replace(/\s*\u2013\s*/g, " — ");
  // Ellipsis character → three dots so length math stays predictable.
  text = text.replace(/\u2026/g, "...");
  // Collapse runs of 4+ dots down to "..." but leave "..." and ".." alone.
  text = text.replace(/\.{4,}/g, "...");
  // Collapse 2+ spaces on the same line to a single space.
  text = text.replace(/[ \t]{2,}/g, " ");
  // Trim trailing whitespace per line.
  text = text.replace(/[ \t]+(\r?\n)/g, "$1");
  // Normalize CRLF to LF.
  text = text.replace(/\r\n?/g, "\n");
  // Collapse 3+ blank lines down to a single blank line (paragraph separator).
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

function fixPunctuationSpacing(input: string): string {
  let text = input;
  // Remove space before sentence-ending punctuation: "hello !" → "hello!"
  text = text.replace(/[ \t]+([,.!?;:])/g, "$1");
  // Ensure exactly one space after sentence punctuation when followed by a
  // word character on the same line (skip if it's a decimal like 3.14 or
  // an ellipsis chain we already normalized).
  text = text.replace(/([,;:])([^\s\d])/g, "$1 $2");
  text = text.replace(/([.!?])([A-Za-z\u00C0-\u024F])/g, "$1 $2");
  // Deduplicate stacked punctuation like "!!!!" or "??!!" → keep at most "!!" / "?!".
  text = text.replace(/([!?])\1{2,}/g, "$1$1");
  text = text.replace(/[!?]{4,}/g, (m) => (m.includes("?") ? "?!" : "!!"));
  // Remove duplicate commas / semicolons.
  text = text.replace(/,{2,}/g, ",");
  text = text.replace(/;{2,}/g, ";");
  // Normalize spaces inside parentheses/brackets/quotes: "( word )" → "(word)".
  text = text.replace(/\(\s+/g, "(");
  text = text.replace(/\s+\)/g, ")");
  text = text.replace(/\[\s+/g, "[");
  text = text.replace(/\s+\]/g, "]");
  return text;
}

function balanceQuotesAndParens(input: string): string {
  let text = input;
  // If we have an odd number of straight double-quotes, drop the last lone one.
  const doubleCount = (text.match(/"/g) ?? []).length;
  if (doubleCount % 2 === 1) {
    const lastIdx = text.lastIndexOf('"');
    if (lastIdx >= 0) {
      text = text.slice(0, lastIdx) + text.slice(lastIdx + 1);
    }
  }
  // Match parenthesis count: append closing if we have more "(" than ")".
  let opens = 0;
  let closes = 0;
  for (const ch of text) {
    if (ch === "(") opens++;
    else if (ch === ")") closes++;
  }
  if (opens > closes) {
    text += ")".repeat(opens - closes);
  } else if (closes > opens) {
    // Strip trailing unmatched closes one at a time.
    let extra = closes - opens;
    for (let i = text.length - 1; i >= 0 && extra > 0; i--) {
      if (text[i] === ")") {
        text = text.slice(0, i) + text.slice(i + 1);
        extra--;
      }
    }
  }
  return text;
}

function deRandomizeAllCaps(input: string): string {
  // Convert single ALL-CAPS words that are NOT in our allowlist to title case
  // (first letter upper, rest lower). Skip hashtags, mentions, URLs, digits.
  return input.replace(/(^|[^#@\w])([A-Z]{2,}'?[A-Z]*)(?=[^\w]|$)/g, (m, prefix, word) => {
    if (ALLOWED_ALL_CAPS.has(word)) {
      return m;
    }
    // If the very next "real" character after this token isn't a letter (it's
    // punctuation), still demote it.
    const lower = word.toLowerCase();
    const titled = lower.charAt(0).toUpperCase() + lower.slice(1);
    return `${prefix}${titled}`;
  });
}

function capitalizeSentenceStarts(input: string): string {
  // Capitalize the first alphabetical character of the whole caption AND the
  // first alphabetical character after each sentence-ending punctuation, but
  // ONLY for words that aren't a hashtag, mention, or all-lowercase brand
  // (e.g. iPhone, eBay-style prefix words we leave alone).
  let text = input;

  // First char of the whole text (skip leading emoji / whitespace).
  text = text.replace(/^(\s*[^\p{L}\p{N}#@]*)(\p{Ll})/u, (_m, lead, ch) => `${lead}${ch.toUpperCase()}`);

  // After every ". " / "! " / "? " / "\n\n", capitalize the next alpha char,
  // unless it's a hashtag/mention/lowercase brand (we treat lowercase brand as
  // any word starting with a lowercase letter immediately followed by an
  // uppercase letter, e.g. "iPhone").
  text = text.replace(
    /([.!?]\s+|\n\n+)([#@]?)(\p{L})(\p{L}?)/gu,
    (match, sep, sigil, first, second) => {
      if (sigil) {
        return match; // leave hashtags/mentions alone
      }
      // iPhone, eBay, dBrand style — leave the lowercase first letter alone.
      if (
        first === first.toLowerCase() &&
        first !== first.toUpperCase() &&
        second &&
        second === second.toUpperCase() &&
        second !== second.toLowerCase()
      ) {
        return match;
      }
      return `${sep}${first.toUpperCase()}${second}`;
    }
  );

  return text;
}

// Pinterest/TikTok-style platforms sometimes return captions where the model
// re-collapsed an emoji into a word ("emoji" or "💪💪💪💪💪💪"). We dedupe
// runs of the same emoji down to a single character.
function deduplicateEmojiRuns(input: string): string {
  // Match runs of identical emoji-like extended graphemes (very approximate).
  return input.replace(
    /(\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*)(?:\s*\1){1,}/gu,
    "$1"
  );
}

function normalizeEmojiSpacing(input: string): string {
  let text = input;
  // Add a single space before an emoji that is glued to a non-space, non-punct
  // character — keeps "the day 💪" instead of "the day💪".
  text = text.replace(
    /([\p{L}\p{N}\)\]"'!?.,])(\p{Extended_Pictographic})/gu,
    "$1 $2"
  );
  // Same for after an emoji glued to a letter/number.
  text = text.replace(
    /(\p{Extended_Pictographic})([\p{L}\p{N}\(])/gu,
    "$1 $2"
  );
  // Collapse multiple spaces left over from the above.
  text = text.replace(/[ \t]{2,}/g, " ");
  return text;
}

// Many Pinterest/Instagram captions end the body with a question; the model
// occasionally drops the "?" and leaves it as a statement. We only fix this
// for the LAST sentence of the body (never inside a paragraph), and only
// when it clearly starts with a question word.
const QUESTION_WORDS = [
  "what",
  "why",
  "how",
  "when",
  "where",
  "who",
  "which",
  "whose",
  "whom",
  "are",
  "is",
  "do",
  "does",
  "did",
  "can",
  "could",
  "would",
  "should",
  "will",
  "have",
  "has",
  "had",
  "am",
  "was",
  "were",
];

function ensureTerminalPunctuationOnBody(body: string): string {
  // Walk paragraphs (separated by \n\n) and make sure each paragraph ends in
  // ., !, ?, or an emoji. If a paragraph clearly reads as a question (starts
  // with a question word), use "?". Otherwise default to ".".
  const paragraphs = body.split(/\n{2,}/);
  const fixed = paragraphs.map((para) => {
    const trimmed = para.trimEnd();
    if (!trimmed) return trimmed;
    const lastChar = trimmed.slice(-1);
    if (
      lastChar === "." ||
      lastChar === "!" ||
      lastChar === "?" ||
      /\p{Extended_Pictographic}/u.test(lastChar)
    ) {
      return trimmed;
    }
    // If the trimmed string ends with " — " or ":" or ",", strip it before
    // adding terminal punctuation.
    const stripped = trimmed.replace(/[\s\u2014:,;]+$/u, "");
    if (!stripped) {
      return stripped;
    }
    const firstWord = stripped
      .replace(/^[^\p{L}]+/u, "")
      .split(/\s+/)[0]
      ?.toLowerCase();
    const punct = firstWord && QUESTION_WORDS.includes(firstWord) ? "?" : ".";
    return `${stripped}${punct}`;
  });
  return fixed.join("\n\n");
}

// Pull off any trailing hashtag-only line so we don't accidentally touch it
// during punctuation/cap fixes. We re-attach it at the very end.
function splitTrailingHashtagBlock(text: string): { body: string; tailHashtags: string } {
  const trimmed = text.trim();
  const lastBreak = trimmed.lastIndexOf("\n\n");
  const candidate = lastBreak >= 0 ? trimmed.slice(lastBreak + 2).trim() : "";
  if (candidate && /^(?:#[\p{L}\p{N}_]+(?:\s+|$))+$/u.test(candidate)) {
    return {
      body: trimmed.slice(0, lastBreak).trimEnd(),
      tailHashtags: candidate.split(/\s+/).filter(Boolean).join(" "),
    };
  }
  return { body: trimmed, tailHashtags: "" };
}

function processTokens(input: string, mapper: (token: string) => string): string {
  return input
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part) || !part) return part;
      if (TOKEN_SKIP_REGEX.test(part)) return part;
      return mapper(part);
    })
    .join("");
}

/**
 * Public formatter — runs every model-generated caption through a single,
 * predictable cleanup pass. Order matters; each step assumes the previous
 * step has already normalized whitespace/punctuation.
 */
export function polishCaption(raw: string): string {
  if (!raw) return raw;

  let text = normalizeWhitespaceAndUnicode(raw);

  // Protect trailing hashtag block from sentence-fix logic.
  const { body, tailHashtags } = splitTrailingHashtagBlock(text);

  let next = body;
  next = fixPunctuationSpacing(next);
  next = balanceQuotesAndParens(next);
  next = processTokens(next, (token) => deRandomizeAllCaps(token));
  next = deduplicateEmojiRuns(next);
  next = normalizeEmojiSpacing(next);
  next = ensureTerminalPunctuationOnBody(next);
  next = capitalizeSentenceStarts(next);

  // Final whitespace sweep.
  next = next.replace(/[ \t]{2,}/g, " ").trim();

  text = tailHashtags ? `${next}\n\n${tailHashtags}` : next;
  return text;
}

export function polishCaptions(captions: string[]): string[] {
  return captions.map(polishCaption);
}
