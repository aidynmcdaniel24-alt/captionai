import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq-client";
import { parseLenientJson } from "@/lib/groq-json";
import { withGroqRetry } from "@/lib/groq-retry";
import { isProPlan } from "@/lib/plan";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import {
  readJsonWithLimit,
  REQUEST_SIZE_LIMITS,
} from "@/lib/security/request-size";
import { sanitizeText } from "@/lib/security/sanitize";
import { getPlan, spendTokens, TOKEN_COSTS, tokenInfoPayload } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmojiSuggestion = {
  emoji: string;
  explanation: string;
  placement: string;
};

export async function POST(req: Request) {
  const authResult = await requireUser(req, "tools:emoji-suggest");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "tools:emoji-suggest", RATE_LIMITS.captionGenerate);
  if (rateLimited) return rateLimited;

  const plan = await getPlan(userId);
  if (!isProPlan(plan)) {
    return NextResponse.json(
      { error: "Emoji Suggester is a Pro feature.", proRequired: true },
      { status: 402 }
    );
  }

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const caption = sanitizeText(body.caption, { maxLength: 4000, allowLineBreaks: true });
  if (!caption) {
    return NextResponse.json({ error: "Caption is required." }, { status: 400 });
  }

  const groq = getGroqClient();
  if (!groq) return NextResponse.json({ error: "AI unavailable." }, { status: 503 });

  const spend = await spendTokens(userId, TOKEN_COSTS.emoji, "tools:emoji-suggest");
  if (!spend.ok) return spend.response;

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.65,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Suggest exactly 10 perfect emojis for a social media caption. Return strict JSON: {"suggestions":[{"emoji":"🔥","explanation":"why it fits","placement":"after the hook line / end of sentence about X"}]}. Each emoji is a single character. placement must say WHERE in the caption to put it.',
          },
          {
            role: "user",
            content: `Caption:\n"""${caption}"""\n\nReturn 10 suggestions in JSON.`,
          },
        ],
      })
    );

    const parsed = parseLenientJson<{ suggestions?: EmojiSuggestion[] }>(
      completion.choices[0]?.message?.content ?? ""
    );
    const suggestions = (parsed?.suggestions ?? [])
      .filter((s) => s?.emoji && s.explanation)
      .slice(0, 10);

    if (suggestions.length === 0) {
      return NextResponse.json({ error: "Could not suggest emojis." }, { status: 502 });
    }

    return NextResponse.json({ suggestions, tokens: tokenInfoPayload(spend) });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not suggest emojis.") },
      { status: 500 }
    );
  }
}
