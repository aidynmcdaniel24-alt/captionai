import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq-client";
import { parseLenientJson } from "@/lib/groq-json";
import { withGroqRetry } from "@/lib/groq-retry";
import { bestTimeResearchBlock } from "@/lib/best-time-data";
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

type CalendarDay = {
  day: string;
  dayLabel: string;
  caption: string;
  bestTime: string;
  hashtags: string;
  hook: string;
};

export async function POST(req: Request) {
  const authResult = await requireUser(req, "tools:caption-calendar");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "tools:caption-calendar",
    RATE_LIMITS.captionGenerate
  );
  if (rateLimited) return rateLimited;

  const plan = await getPlan(userId);
  if (!isAnnualPlan(plan)) {
    return NextResponse.json(
      { error: "Caption Calendar is an Annual feature.", annualRequired: true },
      { status: 402 }
    );
  }

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const theme = sanitizeText(body.theme ?? body.topic, { maxLength: 200, allowLineBreaks: true });
  const platform = sanitizeText(body.platform ?? "Instagram", { maxLength: 80 }) || "Instagram";
  const tone = sanitizeText(body.tone ?? "inspirational", { maxLength: 80 }) || "inspirational";

  if (!theme) {
    return NextResponse.json({ error: "Content theme is required." }, { status: 400 });
  }

  const groq = getGroqClient();
  if (!groq) return NextResponse.json({ error: "AI unavailable." }, { status: 503 });

  const spend = await spendTokens(userId, TOKEN_COSTS.calendar, "tools:caption-calendar");
  if (!spend.ok) return spend.response;

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.75,
        max_tokens: 3500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You create a 7-day social media caption calendar. Return strict JSON:
{"days":[
  {"day":"Monday","dayLabel":"Monday Motivation","caption":"full caption","bestTime":"Tuesday 9am","hashtags":"#tag1 #tag2","hook":"the opening hook line"}
]}
Exactly 7 days (Monday through Sunday). Use day-specific hooks (Monday motivation, Wednesday wisdom, Friday vibes, etc.). bestTime must use research-backed windows:
${bestTimeResearchBlock()}`,
          },
          {
            role: "user",
            content: `Theme: "${theme}"\nPlatform: ${platform}\nTone: ${tone}\n\nGenerate 7 days of captions.`,
          },
        ],
      })
    );

    const parsed = parseLenientJson<{ days?: CalendarDay[] }>(
      completion.choices[0]?.message?.content ?? ""
    );
    const days = parsed?.days?.filter((d) => d.caption)?.slice(0, 7) ?? [];
    if (days.length < 7) {
      return NextResponse.json({ error: "Could not generate the full calendar." }, { status: 502 });
    }

    return NextResponse.json({ days, theme, platform, tone, tokens: tokenInfoPayload(spend) });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not generate calendar.") },
      { status: 500 }
    );
  }
}
