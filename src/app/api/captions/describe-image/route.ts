import { NextResponse } from "next/server";
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
import { isAllowedImageMime, sanitizeText } from "@/lib/security/sanitize";
import { spendTokens, TOKEN_COSTS, tokenInfoPayload } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allow up to ~6.7 MB so a base64-encoded 5 MB image still fits
// (base64 inflates the payload by ~33%).
const MAX_IMAGE_BODY_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DECODED_BYTES = 5 * 1024 * 1024;

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

function estimateBase64Bytes(b64: string): number {
  const cleaned = b64.replace(/\s+/g, "");
  return Math.floor((cleaned.length * 3) / 4);
}

export async function POST(req: Request) {
  const authResult = await requireUser(req, "captions:describe-image");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "captions:describe-image",
    RATE_LIMITS.captionGenerate,
    "Too many image requests. Please wait a moment."
  );
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    MAX_IMAGE_BODY_BYTES
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const imageData =
    typeof body.imageData === "string" ? body.imageData : "";
  const mimeType = sanitizeText(body.mimeType, { maxLength: 64 }).toLowerCase();

  if (!imageData) {
    return NextResponse.json({ error: "Image data is required." }, { status: 400 });
  }

  // Accept either a full data URL or raw base64. Normalize to a data URL
  // for the Groq vision API.
  let dataUrl = imageData.trim();
  if (!dataUrl.startsWith("data:")) {
    if (!isAllowedImageMime(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPG, PNG, or WEBP." },
        { status: 400 }
      );
    }
    dataUrl = `data:${mimeType};base64,${dataUrl.replace(/^data:[^;]+;base64,/, "")}`;
  } else {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
    if (!match) {
      return NextResponse.json(
        { error: "Image data URL is malformed." },
        { status: 400 }
      );
    }
    if (!isAllowedImageMime(match[1])) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPG, PNG, or WEBP." },
        { status: 400 }
      );
    }
    if (estimateBase64Bytes(match[2]!) > MAX_IMAGE_DECODED_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Maximum 5 MB." },
        { status: 413 }
      );
    }
  }

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json({ error: "AI unavailable." }, { status: 503 });
  }

  const spend = await spendTokens(userId, TOKEN_COSTS.image, "captions:describe-image");
  if (!spend.ok) {
    return spend.response;
  }

  try {
    const completion = await withGroqRetry(() =>
      groq.chat.completions.create({
        model: VISION_MODEL,
        temperature: 0.4,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You describe photos so a social media copywriter can write a caption. Reply with one short paragraph (max 60 words) listing the subject, setting, mood, and any text in the photo. No markdown, no preamble, just the description.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this photo for a caption-writing AI.",
              },
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      })
    );

    const description =
      completion.choices[0]?.message?.content?.toString().trim() ?? "";
    if (!description) {
      return NextResponse.json(
        { error: "Could not describe this image. Try a different one." },
        { status: 502 }
      );
    }

    const cleaned = description
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 500);

    return NextResponse.json({
      description: cleaned,
      tokens: tokenInfoPayload(spend),
    });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not analyze image.") },
      { status: 500 }
    );
  }
}
