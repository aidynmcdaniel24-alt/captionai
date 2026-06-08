import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq-client";
import { parseLenientJson } from "@/lib/groq-json";
import { withGroqRetry } from "@/lib/groq-retry";
import { isAnnualPlan } from "@/lib/plan";
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

type HashtagEntry = { tag: string; reason: string };

type HashtagStrategy = {
  broad: HashtagEntry[];
  medium: HashtagEntry[];
  niche: HashtagEntry[];
  trending: HashtagEntry[];
};

export async function POST(req: Request) {
  const authResult = await requireUser(req, "tools:hashtag-analyzer");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "tools:hashtag-analyzer",
    RATE_LIMITS.captionGenerate
  );
  if (rateLimited) return rateLimited;

  const plan = await getPlan(userId);
  if (!isAnnualPlan(plan)) {
    return NextResponse.json(
      { error: "Hashtag Analyzer is an Annual feature.", annualRequired: true },
      { status: 402 }
    );
  }

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const niche = sanitizeText(body.niche ?? body.topic, { maxLength: 200, allowLineBreaks: true });
  const platform = sanitizeText(body.platform ?? "Instagram", { maxLength: 80 }) || "Instagram";

  if (!niche) {
    return NextResponse.json({ error: "Niche or topic is required." }, { status: 400 });
  }

  const groq = getGroqClient();
  if (!groq) return NextResponse.json({ error: "AI unavailable." }, { status: 503 });

  const spend = await spendTokens(userId, TOKEN_COSTS.hashtagStrategy, "tools:hashtag-analyzer");
  if (!spend.ok) return spend.response;

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.55,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You build hashtag strategies for social media. Return strict JSON:
{
  "broad": [{"tag":"#example","reason":"why — millions of posts, reach"}],
  "medium": [{"tag":"#example","reason":"why — 100k-1M posts, discovery"}],
  "niche": [{"tag":"#example","reason":"why — under 100k, targeted audience"}],
  "trending": [{"tag":"#example","reason":"why — trending now for this topic"}]
}
Exactly 5 broad, 5 medium, 5 niche, 3 trending. All tags lowercase with #. Explain why each was chosen.`,
          },
          {
            role: "user",
            content: `Niche/topic: "${niche}"\nPlatform: ${platform}\n\nBuild the complete hashtag strategy.`,
          },
        ],
      })
    );

    const parsed = parseLenientJson<HashtagStrategy>(
      completion.choices[0]?.message?.content ?? ""
    );
    if (!parsed?.broad?.length) {
      return NextResponse.json({ error: "Could not build hashtag strategy." }, { status: 502 });
    }

    return NextResponse.json({
      strategy: parsed,
      niche,
      platform,
      tokens: tokenInfoPayload(spend),
    });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not analyze hashtags.") },
      { status: 500 }
    );
  }
}
