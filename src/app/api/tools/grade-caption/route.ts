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

type GradeResult = {
  total: number;
  hook: number;
  emotion: number;
  cta: number;
  platformFit: number;
  originality: number;
  tips: {
    hook: string;
    emotion: string;
    cta: string;
    platformFit: string;
    originality: string;
  };
  improved: string;
};

export async function POST(req: Request) {
  const authResult = await requireUser(req, "tools:grade-caption");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "tools:grade-caption", RATE_LIMITS.captionGenerate);
  if (rateLimited) return rateLimited;

  const plan = await getPlan(userId);
  if (!isAnnualPlan(plan)) {
    return NextResponse.json(
      { error: "Caption Grader is an Annual feature.", annualRequired: true },
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
    return NextResponse.json({ error: "Caption is required." }, { status: 400 });
  }

  const groq = getGroqClient();
  if (!groq) return NextResponse.json({ error: "AI unavailable." }, { status: 503 });

  const spend = await spendTokens(userId, TOKEN_COSTS.grade, "tools:grade-caption");
  if (!spend.ok) return spend.response;

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Grade a social media caption out of 100 with this breakdown:
- hook (0-25): hook strength
- emotion (0-25): emotional engagement
- cta (0-20): call to action
- platformFit (0-20): platform fit for the given platform
- originality (0-10): originality
total = sum of the five.

Return strict JSON:
{
  "total": 0-100,
  "hook": 0-25, "emotion": 0-25, "cta": 0-20, "platformFit": 0-20, "originality": 0-10,
  "tips": {"hook":"specific tip","emotion":"...","cta":"...","platformFit":"...","originality":"..."},
  "improved": "full rewritten caption with ALL improvements applied, ready to paste"
}`,
          },
          {
            role: "user",
            content: `Platform: ${platform}\n\nCaption to grade:\n"""${caption}"""`,
          },
        ],
      })
    );

    const parsed = parseLenientJson<GradeResult>(
      completion.choices[0]?.message?.content ?? ""
    );
    if (!parsed?.improved || typeof parsed.total !== "number") {
      return NextResponse.json({ error: "Could not grade the caption." }, { status: 502 });
    }

    return NextResponse.json({ grade: parsed, tokens: tokenInfoPayload(spend) });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not grade the caption.") },
      { status: 500 }
    );
  }
}
