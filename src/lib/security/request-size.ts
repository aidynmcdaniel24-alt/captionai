import "server-only";
import { NextResponse } from "next/server";

const KB = 1024;
const MB = 1024 * 1024;

/**
 * Per-route maximum request body sizes. Anything larger is rejected with
 * a 413 response before we attempt to parse or process the payload.
 */
export const REQUEST_SIZE_LIMITS = {
  captionGenerate: 10 * KB,
  contact: 5 * KB,
  testimonial: 5 * KB,
  profilePicture: 1 * MB,
  affiliate: 5 * KB,
  default: 50 * KB,
} as const;

export type ReadJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

function tooLarge(maxBytes: number): { ok: false; response: NextResponse } {
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: `Request body too large. Maximum size is ${formatBytes(maxBytes)}.`,
      },
      { status: 413 }
    ),
  };
}

function badJson(): { ok: false; response: NextResponse } {
  return {
    ok: false,
    response: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }),
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${Math.round(bytes / MB)} MB`;
  if (bytes >= KB) return `${Math.round(bytes / KB)} KB`;
  return `${bytes} bytes`;
}

/**
 * Read a JSON body, enforcing a hard byte cap before parsing. The size
 * check uses the Content-Length header first (cheap fast-path) and then
 * verifies the actual payload length once the body has been read.
 */
export async function readJsonWithLimit<T = unknown>(
  req: Request,
  maxBytes: number
): Promise<ReadJsonResult<T>> {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return tooLarge(maxBytes);
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return badJson();
  }

  if (text.length > maxBytes) {
    return tooLarge(maxBytes);
  }

  if (!text.trim()) {
    return { ok: true, data: {} as T };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return badJson();
  }
}

/**
 * Read a raw text body, enforcing a hard byte cap. Use for Stripe-style
 * webhooks where the body must remain unparsed for signature checks.
 */
export async function readTextWithLimit(
  req: Request,
  maxBytes: number
): Promise<{ ok: true; data: string } | { ok: false; response: NextResponse }> {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return tooLarge(maxBytes);
  }
  try {
    const text = await req.text();
    if (text.length > maxBytes) return tooLarge(maxBytes);
    return { ok: true, data: text };
  } catch {
    return badJson();
  }
}
