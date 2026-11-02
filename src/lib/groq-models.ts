import "server-only";

/**
 * Single place that decides which Groq models the app calls.
 *
 * Groq retired llama-3.3-70b-versatile and llama-3.1-8b-instant on 2026-08-16
 * (https://console.groq.com/docs/deprecations), so requests to them fail.
 * Override without a code change by setting GROQ_MODEL / GROQ_FAST_MODEL in
 * the Vercel environment variables.
 */
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_FAST_MODEL = "openai/gpt-oss-20b";

export function getGroqModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

export function getGroqFastModel(): string {
  return process.env.GROQ_FAST_MODEL?.trim() || DEFAULT_FAST_MODEL;
}

/**
 * Model + reasoning settings for a chat completion. gpt-oss models are
 * reasoning models, so keep reasoning short; other models reject the field.
 */
export function groqChatParams(model: string = getGroqModel()) {
  if (model.startsWith("openai/gpt-oss")) {
    return { model, reasoning_effort: "low" as const };
  }
  return { model };
}
