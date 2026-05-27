import { NextResponse } from "next/server";
import { guardTopic } from "@/lib/content-moderation";
import { getGroqClient } from "@/lib/groq-client";
import { withGroqRetry } from "@/lib/groq-retry";
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
import { spendTokens, TOKEN_COSTS, tokenInfoPayload } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseBio(raw: string): string | null {
  try {
    const j = JSON.parse(raw) as { bio?: string };
    const b = j.bio?.trim();
    return b || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const authResult = await requireUser(req, "tools:bio");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "tools:bio", RATE_LIMITS.captionGenerate);
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const about = sanitizeText(body.about, { maxLength: 1000, allowLineBreaks: true });
  const platform = sanitizeText(body.platform ?? "Instagram", { maxLength: 80 });
  const tone = sanitizeText(body.tone ?? "professional", { maxLength: 80 });

  if (!about) {
    return NextResponse.json({ error: "Tell us about you or your brand." }, { status: 400 });
  }

  const moderation = await guardTopic(about, {
    userId,
    feature: "tools:bio",
  });
  if (!moderation.ok) return moderation.response;

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json({ error: "AI unavailable." }, { status: 503 });
  }

  const spend = await spendTokens(userId, TOKEN_COSTS.bio, "tools:bio");
  if (!spend.ok) {
    return spend.response;
  }

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write social media profile bios. Output must be a single JSON object only — no markdown fences, no commentary, no text before or after the JSON.",
          },
          {
            role: "user",
            content: `Write ONE concise profile bio for ${platform} with tone: ${tone}.
About: "${about}"
Keep within the platform's typical bio length (around 150-160 characters where appropriate). Return JSON exactly in this shape: {"bio":"the bio text"}`,
          },
        ],
      })
    );

    const content = completion.choices[0]?.message?.content ?? "";
    const bio = parseBio(content);
    if (!bio) {
      return NextResponse.json({ error: "Could not parse bio." }, { status: 502 });
    }
    return NextResponse.json({ bio, tokens: tokenInfoPayload(spend) });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not generate bio.") },
      { status: 500 }
    );
  }
}
