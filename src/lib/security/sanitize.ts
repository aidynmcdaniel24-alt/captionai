import "server-only";

/**
 * Defensive input sanitization helpers. React already escapes anything
 * rendered via JSX text nodes, so these are belt-and-suspenders for the
 * server side (database storage, email bodies, JSON responses) and for
 * any value that ever crosses an HTML boundary.
 */

const SCRIPT_TAG_RE = /<script[\s\S]*?<\/script>/gi;
const STYLE_TAG_RE = /<style[\s\S]*?<\/style>/gi;
const HTML_TAG_RE = /<\/?[a-z][^>]*>/gi;
const UNSAFE_URL_RE = /(?:javascript|vbscript|data|file)\s*:/gi;
const ON_EVENT_RE = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const NULL_BYTE_RE = /\0/g;
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function stripHtml(input: string): string {
  return input
    .replace(SCRIPT_TAG_RE, "")
    .replace(STYLE_TAG_RE, "")
    .replace(ON_EVENT_RE, "")
    .replace(HTML_TAG_RE, "");
}

export function removeUnsafeUrls(input: string): string {
  return input.replace(UNSAFE_URL_RE, (m) => m.replace(/[a-z]/gi, ""));
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/[ \t]+/g, " ").replace(/[ \t]+\n/g, "\n").trim();
}

export type SanitizeOptions = {
  /** Truncate the final string to this number of characters. */
  maxLength?: number;
  /** Preserve newline characters (otherwise all whitespace collapses to a single space). */
  allowLineBreaks?: boolean;
};

/**
 * Strip HTML, neutralize unsafe URL schemes, drop control characters,
 * normalize whitespace, and enforce a length cap.
 */
export function sanitizeText(input: unknown, opts: SanitizeOptions = {}): string {
  let value = typeof input === "string" ? input : input == null ? "" : String(input);

  value = value.replace(NULL_BYTE_RE, "");
  value = value.replace(CONTROL_CHAR_RE, "");
  value = stripHtml(value);
  value = removeUnsafeUrls(value);

  if (opts.allowLineBreaks) {
    value = value.replace(/\r\n/g, "\n");
    value = normalizeWhitespace(value);
    value = value.replace(/\n{3,}/g, "\n\n");
  } else {
    value = value.replace(/\s+/g, " ").trim();
  }

  if (typeof opts.maxLength === "number" && opts.maxLength > 0) {
    value = value.slice(0, opts.maxLength);
  }

  return value;
}

/**
 * Escape user content for safe inclusion in an HTML document (emails,
 * server-rendered HTML strings). React JSX already handles this for
 * normal rendering, so reach for this only when you build HTML yourself.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeEmail(input: unknown): string {
  return sanitizeText(input, { maxLength: 320 }).toLowerCase();
}

export function isValidEmail(value: string): boolean {
  if (!value || value.length > 320) return false;
  return EMAIL_RE.test(value);
}

const ALLOWED_IMAGE_MIME_TYPES = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export function isAllowedImageMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return ALLOWED_IMAGE_MIME_TYPES.has(mime.toLowerCase());
}

/**
 * Sanitize file metadata before persisting it. Strips path traversal
 * sequences, control characters, and HTML, and clamps the length.
 */
export function sanitizeFileName(input: unknown, maxLength = 120): string {
  let value = typeof input === "string" ? input : "";
  value = value.replace(NULL_BYTE_RE, "");
  value = value.replace(CONTROL_CHAR_RE, "");
  value = value.replace(/[\\/]+/g, "_");
  value = value.replace(/\.{2,}/g, ".");
  value = stripHtml(value);
  value = value.trim();
  return value.slice(0, maxLength);
}
