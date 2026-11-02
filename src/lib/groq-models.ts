import "server-only";

/**
 * Single place that decides which Groq models the app calls.
 *
 * Groq retired llama-3.3-70b-versatile, llama-3.1-8b-instant and
 * llama-4-scout on their shutdown dates
 * (https://console.groq.com/docs/deprecations), so requests to them fail.
 * Override without a code change by setting GROQ_MODEL, GROQ_FAST_MODEL or
 * GROQ_VISION_MODEL in the Vercel environment variables.
 */
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_FAST_MODEL = "openai/gpt-oss-20b";
const DEFAULT_VISION_MODEL = "qwen/qwen3.8-27b";

/** Extra completion tokens so reasoning models don't run out before answering. */
const REASONING_HEADROOM_TOKENS = 1024;

export function getGroqModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

export function getGroqFastModel(): string {
  return process.env.GROQ_FAST_MODEL?.trim() || DEFAULT_FAST_MODEL;
}

export function getGroqVisionModel(): string {
  return process.env.GROQ_VISION_MODEL?.trim() || DEFAULT_VISION_MODEL;
}

function isGptOss(model: string): boolean {
  return model.startsWith("openai/gpt-oss");
}

/**
 * Model + reasoning settings for a chat completion. gpt-oss keeps reasoning
 * short; Qwen reasoning is switched off so no <think> text lands in the
 * answer; other models reject the field, so they get the model only.
 */
export function groqChatParams(model: string = getGroqModel()) {
  if (isGptOss(model)) {
    return { model, reasoning_effort: "low" as const };
  }
  if (model.startsWith("qwen/")) {
    return { model, reasoning_effort: "none" as const };
  }
  return { model };
}

/** Token cap for a call, with extra room when the model reasons before answering. */
export function groqMaxTokens(
  maxTokens: number,
  model: string = getGroqModel()
): number {
  return isGptOss(model) ? maxTokens + REASONING_HEADROOM_TOKENS : maxTokens;
}
