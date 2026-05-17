/** Strip markdown code fences from model output. */
export function extractJsonPayload(raw: string): string {
  const s = raw.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i;
  const m = s.match(fence);
  return m ? m[1]!.trim() : s;
}

/** Find the first balanced `{ ... }` object in text (ignores braces inside strings). */
export function extractBalancedJsonObject(raw: string): string | null {
  const text = extractJsonPayload(raw);
  const start = text.indexOf("{");
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/** Apply common fixes for near-valid JSON from LLMs. */
export function repairJsonText(json: string): string {
  return json
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,(\s*[}\]])/g, "$1");
}

function uniqueCandidates(raw: string): string[] {
  const out: string[] = [];
  const add = (s: string | null | undefined) => {
    const t = s?.trim();
    if (t && !out.includes(t)) {
      out.push(t);
    }
  };
  add(raw);
  add(extractJsonPayload(raw));
  add(extractBalancedJsonObject(raw));
  return out;
}

/** Parse JSON from model text using extraction and light repair before giving up. */
export function parseLenientJson<T = unknown>(raw: string): T | null {
  for (const candidate of uniqueCandidates(raw)) {
    for (const variant of [candidate, repairJsonText(candidate)]) {
      try {
        return JSON.parse(variant) as T;
      } catch {
        // try next variant
      }
    }
  }
  return null;
}
