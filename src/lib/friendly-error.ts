// Maps raw API/network errors to friendly, human messages we can show users.
// Keep this client-safe (no server-only imports) so any component can use it.

const DEFAULT_MESSAGE = "Something went wrong on our end. Try again shortly.";

type FriendlyErrorInput =
  | string
  | null
  | undefined
  | { message?: string | null; status?: number | null };

/**
 * Normalize a raw error message and/or HTTP status into a friendly message.
 *
 * - Unauthorized / 401      → "Please sign in to continue"
 * - Rate limit / 429        → "You're generating too fast — wait a moment and try again."
 * - Network / 500 / 502 / 503 → "Something went wrong on our end. Try again shortly."
 *
 * If the server returned a specific, already-friendly message that doesn't match
 * any of these buckets, we surface that message instead of a generic fallback.
 */
export function friendlyError(
  input?: FriendlyErrorInput,
  fallback: string = DEFAULT_MESSAGE
): string {
  const raw = (typeof input === "string" ? input : input?.message ?? "").trim();
  const status =
    typeof input === "object" && input ? input.status ?? undefined : undefined;
  const lower = raw.toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    lower === "unauthorized" ||
    lower.includes("not authenticated") ||
    lower.includes("please sign in")
  ) {
    return "Please sign in to continue";
  }

  if (
    status === 429 ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("slow down")
  ) {
    return "You're generating too fast — wait a moment and try again.";
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network error") ||
    lower.includes("network request failed") ||
    lower === "load failed"
  ) {
    return DEFAULT_MESSAGE;
  }

  return raw || fallback;
}

/**
 * Convenience wrapper for a failed `fetch` Response: pulls the JSON `error`
 * field (if any) and maps it through `friendlyError` using the status code.
 */
export async function friendlyErrorFromResponse(
  res: Response,
  fallback?: string
): Promise<string> {
  let serverMessage = "";
  try {
    const body = (await res.clone().json()) as { error?: string };
    serverMessage = body?.error ?? "";
  } catch {
    // Non-JSON response — rely on status code only.
  }
  return friendlyError({ message: serverMessage, status: res.status }, fallback);
}
