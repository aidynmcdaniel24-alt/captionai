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

type CompetitorAnalysis = {
  hookTechnique: string;
  emotionalTriggers: string[];
  ctaType: string;
  hashtagStrategy: string;
  whatWorks: string;
  whatDoesnt: string;
  howToBeatIt: string;
};

export async function POST(req: Request) {
  const authResult = await requireUser(req, "tools:competitor-analyze");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "tools:competitor-analyze",
    RATE_LIMITS.captionGenerate
  );
  if (rateLimited) return rateLimited;

  const plan = await getPlan(userId);
  if (!isAnnualPlan(plan)) {
    return NextResponse.json(
      { error: "Competitor Caption Analyzer is an Annual feature.", annualRequired: true },
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
  const platform = sanitizeText(body.platform ?? "Instagram", { maxLength: 80 }) || "Instagram";

  if (!caption) {
    return NextResponse.json({ error: "Competitor caption is required." }, { status: 400 });
  }

  const groq = getGroqClient();
  if (!groq) return NextResponse.json({ error: "AI unavailable." }, { status: 503 });

  const spend = await spendTokens(userId, TOKEN_COSTS.competitor, "tools:competitor-analyze");
  if (!spend.ok) return spend.response;

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.55,
        max_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Analyze a competitor's social media caption. Return strict JSON:
{
  "hookTechnique": "what hook technique they used",
  "emotionalTriggers": ["trigger1","trigger2"],
  "ctaType": "type of call to action",
  "hashtagStrategy": "their hashtag approach",
  "whatWorks": "what makes it work",
  "whatDoesnt": "what falls flat",
  "howToBeatIt": "how to write something better in the same niche"
}`,
          },
          {
            role: "user",
            content: `Platform: ${platform}\n\nCompetitor caption:\n"""${caption}"""`,
          },
        ],
      })
    );

    const parsed = parseLenientJson<CompetitorAnalysis>(
      completion.choices[0]?.message?.content ?? ""
    );
    if (!parsed?.hookTechnique) {
      return NextResponse.json({ error: "Could not analyze the caption." }, { status: 502 });
    }

    return NextResponse.json({ analysis: parsed, tokens: tokenInfoPayload(spend) });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not analyze the caption.") },
      { status: 500 }
    );
  }
}
