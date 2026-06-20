import { NextResponse } from "next/server";
import { guardTopic } from "@/lib/content-moderation";
import { getGroqClient } from "@/lib/groq-client";
import { withGroqRetry } from "@/lib/groq-retry";
import { sanitizeHashtagsInText } from "@/lib/hashtag-sanitize";
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
    if (!b) return null;
    // Tidy any broken hashtags ("# tag", "#fall_events") that sneak into a bio.
    return sanitizeHashtagsInText(b).trim() || null;
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
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write social media PROFILE BIOS — the short blurb on someone's account, NOT a caption for a single post. A bio describes the ACCOUNT as a whole: who they are, what they offer, where, and what to do next. Output must be a single JSON object only — no markdown fences, no commentary, no text before or after the JSON. Always finish the bio — never cut off mid-sentence.",
          },
          {
            role: "user",
            content: `Write ONE complete ${platform} PROFILE BIO with a ${tone} tone.

About the account: "${about}"

This is a profile bio, NOT a post caption. Write about the account/brand/person overall — never about one specific post or event.

Structure it as short, punchy lines on SEPARATE lines (use "\\n" between lines), in this order, skipping any that don't apply:
1. What the business or person IS — one clear line.
2. What they offer / their specialty.
3. Location, if relevant.
4. A clear call to action (e.g. "Link in bio", "Order online", "DM to book", "Shop now 👇").

Rules:
- Keep each line short and scannable. Lead lines with a relevant emoji where it fits the tone.
- Use line breaks between lines, not one run-on sentence.
- Stay within the platform's bio length (Instagram/TikTok aim for ~150 characters; LinkedIn/Facebook can be a bit longer).
- Write the FULL bio and finish every line — do not get cut off.

Example of the right SHAPE (do not copy the words):
"☕ Small-batch coffee + cozy vibes\\n🍂 New fall menu out now\\n📍 Portland, OR\\n👇 Order online"

Return JSON exactly in this shape: {"bio":"the full bio text with \\n line breaks"}`,
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
