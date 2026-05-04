const DEFAULT_DELAYS_MS = [0, 400, 1200];

export async function withGroqRetry<T>(fn: () => Promise<T>, delaysMs: number[] = DEFAULT_DELAYS_MS): Promise<T> {
  let last: unknown;
  for (let i = 0; i < delaysMs.length; i++) {
    if (delaysMs[i]! > 0) {
      await new Promise((r) => setTimeout(r, delaysMs[i]));
    }
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i === delaysMs.length - 1) {
        break;
      }
    }
  }
  throw last instanceof Error ? last : new Error("Groq request failed after retries.");
}
