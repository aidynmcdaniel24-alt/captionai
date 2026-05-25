import "server-only";

import { getGroqClient } from "@/lib/groq-client";
import { parseLenientJson } from "@/lib/groq-json";
import { withGroqRetry } from "@/lib/groq-retry";

export type ModerationDecision = {
  approved: boolean;
  reason: string;
};

export type ModerationResult =
  | { status: "approved"; reason: string }
  | { status: "rejected"; reason: string }
  | { status: "unavailable"; reason: string };

const SYSTEM_PROMPT = `You are a strict content-moderation classifier for CaptionAI, a tool that helps creators generate social-media captions.

You receive a single user-submitted testimonial (name, title/role, message, rating). Decide whether it should be auto-published.

APPROVE only if ALL of the following are true:
- It is genuine feedback about CaptionAI or the experience of using it.
- It is positive or constructively critical.
- Language is appropriate (no profanity).
- It is relevant to CaptionAI.

REJECT if ANY of the following are true:
- Spam or promotional content for other products/services/brands.
- Hate speech, racism, sexism, slurs, or discriminatory language.
- Profanity or sexually explicit / NSFW content.
- Fake-looking review: gibberish, random characters, keyboard mashing, repeated meaningless strings, or content that clearly was not written as real feedback.
- Threats, harassment, or personal attacks.
- Personal information such as phone numbers, street addresses, emails, or government IDs.
- Any URL, link, domain, or contact handle (e.g. "example.com", "@handle", "http(s)://...", "www.").
- Content that is completely unrelated to CaptionAI or social-media captioning.

Output rules:
- Reply with ONE JSON object only. No prose, no markdown fences, no commentary.
- Shape: {"approved": true|false, "reason": "short user-facing explanation, max 140 chars"}
- If approved, "reason" should be a short friendly confirmation (e.g. "Looks great, thanks!").
- If rejected, "reason" should briefly explain WHY in plain language the submitter can understand (e.g. "Contains a link, which we do not allow." or "Reads as random characters rather than real feedback.").`;

function buildUserPrompt(input: {
  name: string;
  title: string;
  message: string;
  rating: number;
}): string {
  return `Testimonial submission:
Name: ${input.name}
Title/role: ${input.title}
Rating: ${input.rating}/5
Message: """${input.message}"""

Return JSON: {"approved": true|false, "reason": "..."}`;
}

function normaliseReason(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  return trimmed.length > 200 ? `${trimmed.slice(0, 197)}…` : trimmed;
}

/**
 * Moderate a testimonial submission through Groq.
 *
 * Uses a small/fast model and a tight `max_tokens` cap since this is just a
 * classification call — we are NOT generating long content.
 *
 * Returns `{ status: "unavailable" }` when Groq is not configured or the call
 * fails after retries; callers should treat this as "fall back to manual review".
 */
export async function moderateTestimonial(input: {
  name: string;
  title: string;
  message: string;
  rating: number;
}): Promise<ModerationResult> {
  const groq = getGroqClient();
  if (!groq) {
    return {
      status: "unavailable",
      reason: "Moderation service is unavailable.",
    };
  }

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 120,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = parseLenientJson<Partial<ModerationDecision>>(content);

    if (!parsed || typeof parsed.approved !== "boolean") {
      return {
        status: "unavailable",
        reason: "Could not parse moderation response.",
      };
    }

    if (parsed.approved) {
      return {
        status: "approved",
        reason: normaliseReason(parsed.reason, "Looks good — thanks for sharing!"),
      };
    }

    return {
      status: "rejected",
      reason: normaliseReason(
        parsed.reason,
        "This submission did not pass our automated review."
      ),
    };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[testimonial-moderation] Groq call failed:", err);
    }
    return {
      status: "unavailable",
      reason: "Moderation service errored.",
    };
  }
}
