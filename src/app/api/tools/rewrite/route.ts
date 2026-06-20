import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq-client";
import { extractJsonPayload } from "@/lib/groq-json";
import { withGroqRetry } from "@/lib/groq-retry";
import { sanitizeHashtagsInText } from "@/lib/hashtag-sanitize";
import { HUMAN_VOICE_RULES, limitExclamations } from "@/lib/human-voice";
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

const GOALS: Record<string, string> = {
  punchier: "Make it punchier — sharper hook, more energy, tighter rhythm.",
  shorter: "Make it shorter — cut fluff, keep the hook and CTA.",
  longer: "Make it longer — add a sensory detail or micro-story without padding.",
  professional: "Make it more professional — polished but still human.",
  funnier: "Make it funnier — specific, self-aware humor, not corny.",
  emotional: "Make it more emotional — name a real feeling the reader recognizes.",
  grammar: "Fix the grammar, punctuation, and spacing while keeping the voice.",
};

function parseRewrite(raw: string): string | null {
  const payload = extractJsonPayload(raw);
  try {
    const j = JSON.parse(payload) as { rewritten?: string };
    let text = j.rewritten?.toString().trim();
    if (!text || text.length > 4000) return null;
    // Enforce the human-voice rules deterministically: at most one "!" and no
    // broken hashtags slipping through.
    text = limitExclamations(text, 1);
    text = sanitizeHashtagsInText(text).trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const authResult = await requireUser(req, "tools:rewrite");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "tools:rewrite", RATE_LIMITS.captionGenerate);
  if (rateLimited) return rateLimited;

  const plan = await getPlan(userId);
  if (!isProPlan(plan)) {
    return NextResponse.json(
      { error: "Caption Rewriter is a Pro feature.", proRequired: true },
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
  const goalKey = sanitizeText(body.goal ?? "punchier", { maxLength: 40 }).toLowerCase();
  const goal = GOALS[goalKey] ?? GOALS.punchier!;

  if (!caption) {
    return NextResponse.json({ error: "Caption is required." }, { status: 400 });
  }

  const groq = getGroqClient();
  if (!groq) return NextResponse.json({ error: "AI unavailable." }, { status: 503 });

  const spend = await spendTokens(userId, TOKEN_COSTS.rewrite, "tools:rewrite");
  if (!spend.ok) return spend.response;

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.75,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content: `You rewrite social media captions. Reply with strict JSON only: {"rewritten":"..."}. Keep platform voice and hashtag placement correct.

${HUMAN_VOICE_RULES}`,
          },
          {
            role: "user",
            content: `Platform: ${platform}\nGoal: ${goal}\n\nOriginal caption:\n"""${caption}"""\n\nRewrite it following the human-voice rules above — punchier and genuinely better, not just more enthusiastic. Return JSON with key "rewritten" only.`,
          },
        ],
      })
    );

    const rewritten = parseRewrite(completion.choices[0]?.message?.content ?? "");
    if (!rewritten) {
      return NextResponse.json({ error: "Could not rewrite the caption." }, { status: 502 });
    }

    return NextResponse.json({
      original: caption,
      rewritten,
      goal: goalKey,
      tokens: tokenInfoPayload(spend),
    });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not rewrite the caption.") },
      { status: 500 }
    );
  }
}
