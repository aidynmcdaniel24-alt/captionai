import "server-only";

import { NextResponse } from "next/server";
import { ADMIN_EVENTS, logAdminEvent } from "@/lib/admin-log";
import { getGroqClient } from "@/lib/groq-client";
import { parseLenientJson } from "@/lib/groq-json";

/**
 * Hard blocklist — these tokens are always rejected without consulting the
 * AI. They cover the obvious unambiguous-explicit / illegal cases where we
 * never want to risk a false negative from the model. Matched as case-
 * insensitive whole-word tokens (with simple boundary rules) so we don't
 * accidentally block words like "passexcellent" because they contain "sex".
 *
 * Anything ambiguous (e.g. "sex education", "sexy marketing", "naked truth
 * about fitness", "violence prevention") intentionally does NOT live here —
 * we let the AI decide based on context. The user-facing examples in the
 * product spec explicitly require those phrases to be allowed.
 */
const HARD_BLOCKLIST: readonly string[] = [
  "porn",
  "pornhub",
  "xxx",
  "hentai",
  "camgirl",
  "rape",
  "bestiality",
  "child porn",
  "childporn",
  "pedo",
  "pedophile",
  "loli",
  "incest",
  "snuff",
  "cumshot",
  "blowjob",
  "handjob",
  "anal sex",
  "fisting",
  "deepthroat",
  "dildo",
  "fleshlight",
];

export type ModerationConfidence = "high" | "medium" | "low";

export type ModerationResult = {
  allowed: boolean;
  reason: string;
  /** "hard" = hard blocklist hit, "ai" = AI decided, "fallback" = AI failed and fell back. */
  source: "hard" | "ai" | "fallback";
  confidence: ModerationConfidence;
};

const SYSTEM_PROMPT =
  "You are a content moderator for a social media caption generator used by businesses and creators. Analyze this topic and decide if it is appropriate. Reply with JSON only: { appropriate: boolean, reason: string, confidence: 'high'|'medium'|'low' }";

const USER_PROMPT_GUIDE = `Decide if this topic is appropriate for a mainstream social media caption generator used by businesses, creators, and educators.

ALLOW (mark appropriate: true) when the topic is:
- Educational, health, or awareness content even on sensitive subjects (e.g. "sex education for teens", "sexual health awareness", "violence prevention nonprofit", "addiction recovery").
- A clear business, marketing, fitness, fashion, lifestyle, or creator topic — even with edgy wording like "sexy marketing tips", "killer landing page", "beat up my competition", "naked truth about fitness" (these are clearly metaphorical / business framing).
- General lifestyle, food, travel, parenting, pets, art, music, gaming, tech, finance, etc.

BLOCK (mark appropriate: false) when the topic is:
- Sexually explicit content, pornography, nudity-as-content (e.g. "sexy lingerie photo shoot", "nude beach photos", "porn addiction promotion", "OnlyFans growth tips for explicit content").
- Sexual content involving minors — instant block, always.
- Escort, prostitution, or sex-work promotion (e.g. "escort service", "sugar daddy hookup site").
- Promoting real-world violence, harm to people, self-harm, or harming others (e.g. "how to hurt someone", "how to make a bomb").
- Hate speech, slurs, or targeted harassment.
- Promoting illegal drugs sales, weapons sales, or other clearly illegal commerce.

When in doubt and the topic could plausibly be a normal business / educational / creative post, ALLOW with confidence: "medium" or "low".
Only BLOCK when you are confident the topic is explicit, harmful, or illegal in the way described above.

Respond with JSON ONLY in this exact shape: { "appropriate": true|false, "reason": "short one-line explanation", "confidence": "high"|"medium"|"low" }`;

/** Word-boundary-ish search so "sex" inside "passexcellent" does NOT trigger. */
function hasHardBlockedToken(text: string): string | null {
  const lower = text.toLowerCase();
  for (const token of HARD_BLOCKLIST) {
    if (!token) continue;
    if (token.includes(" ")) {
      if (lower.includes(token)) return token;
      continue;
    }
    const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(token)}(?:[^a-z0-9]|$)`, "i");
    if (re.test(lower)) return token;
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normaliseConfidence(raw: unknown): ModerationConfidence {
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "medium";
}

function normaliseReason(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  return trimmed.length > 200 ? `${trimmed.slice(0, 197)}…` : trimmed;
}

const AI_TIMEOUT_MS = 900;

/**
 * Run the AI classifier with a tight timeout so the moderation check
 * always completes well under 1 second even if Groq is slow.
 */
async function classifyWithAi(
  topic: string
): Promise<{
  appropriate: boolean;
  reason: string;
  confidence: ModerationConfidence;
} | null> {
  const groq = getGroqClient();
  if (!groq) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const completion = await groq.chat.completions.create(
      {
        model: "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 100,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `${USER_PROMPT_GUIDE}\n\nTopic to classify: """${topic}"""`,
          },
        ],
      },
      { signal: controller.signal }
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = parseLenientJson<{
      appropriate?: unknown;
      reason?: unknown;
      confidence?: unknown;
    }>(content);

    if (!parsed || typeof parsed.appropriate !== "boolean") {
      return null;
    }

    return {
      appropriate: parsed.appropriate,
      reason: normaliseReason(parsed.reason, parsed.appropriate ? "Looks fine." : "Not appropriate."),
      confidence: normaliseConfidence(parsed.confidence),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Context-aware moderation entrypoint. Runs the hard blocklist first
 * (fast, deterministic), then asks the AI for anything that survives.
 *
 * If the AI call fails or times out, we fall back to "allow" so the
 * product never breaks for legitimate users — the hard blocklist is
 * the last line of defence against the obviously explicit cases.
 */
export async function moderateContent(topic: string): Promise<ModerationResult> {
  const trimmed = typeof topic === "string" ? topic.trim() : "";

  if (!trimmed) {
    return {
      allowed: true,
      reason: "Empty input.",
      source: "hard",
      confidence: "high",
    };
  }

  const hard = hasHardBlockedToken(trimmed);
  if (hard) {
    return {
      allowed: false,
      reason: "Contains explicit/prohibited content.",
      source: "hard",
      confidence: "high",
    };
  }

  const aiDecision = await classifyWithAi(trimmed);
  if (aiDecision) {
    return {
      allowed: aiDecision.appropriate,
      reason: aiDecision.reason,
      source: "ai",
      confidence: aiDecision.confidence,
    };
  }

  return {
    allowed: true,
    reason: "Moderation AI unavailable; passed hard blocklist.",
    source: "fallback",
    confidence: "low",
  };
}

const BLOCK_USER_MESSAGE =
  "This topic is not appropriate for our platform. Please try a different topic.";

export type ModerationGuardResult =
  | { ok: true; result: ModerationResult }
  | { ok: false; response: NextResponse };

/**
 * Drop-in guard for API routes that accept a `topic` (or similar) input.
 *
 * Runs `moderateContent` and, when the topic is blocked:
 *   1. Logs a `content_moderated` event to admin_logs with topic/reason/confidence/feature/user.
 *   2. Returns a generic 400 JSON response — we deliberately do NOT echo back
 *      the offending word/phrase to the user.
 *
 * The route only needs to:
 *   const guard = await guardTopic(topic, { userId, feature: "captions" });
 *   if (!guard.ok) return guard.response;
 */
export async function guardTopic(
  topic: string,
  context: {
    userId: string | null;
    feature: string;
  }
): Promise<ModerationGuardResult> {
  const result = await moderateContent(topic);
  if (result.allowed) {
    return { ok: true, result };
  }

  await logAdminEvent("warn", ADMIN_EVENTS.CONTENT_MODERATED, {
    feature: context.feature,
    user_id: context.userId,
    topic: topic.slice(0, 500),
    reason: result.reason,
    confidence: result.confidence,
    source: result.source,
    timestamp: new Date().toISOString(),
  });

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: BLOCK_USER_MESSAGE,
        moderated: true,
      },
      { status: 400 }
    ),
  };
}

