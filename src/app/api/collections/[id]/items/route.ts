import { NextResponse } from "next/server";
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
import { isProPlan } from "@/lib/plan";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function userIsPro(userId: string): Promise<boolean> {
  const { data } = await supabaseServer
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  return isProPlan(data?.plan);
}

async function ensureOwnership(userId: string, collectionId: string) {
  const { data } = await supabaseServer
    .from("caption_collections")
    .select("id, user_id")
    .eq("id", collectionId)
    .maybeSingle();
  if (!data || data.user_id !== userId) return false;
  return true;
}

export async function POST(req: Request, ctx: RouteContext) {
  const authResult = await requireUser(req, "collections:add-item");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "collections:add-item",
    RATE_LIMITS.generalApi
  );
  if (rateLimited) return rateLimited;

  if (!(await userIsPro(userId))) {
    return NextResponse.json(
      { error: "Caption Collections is a Pro feature.", proRequired: true },
      { status: 402 }
    );
  }

  const { id } = await ctx.params;
  const collectionId = sanitizeText(id, { maxLength: 64 });
  if (!(await ensureOwnership(userId, collectionId))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const captionText = sanitizeText(body.captionText, {
    maxLength: 4000,
    allowLineBreaks: true,
  });
  if (!captionText) {
    return NextResponse.json({ error: "Caption text is required." }, { status: 400 });
  }

  const platform = sanitizeText(body.platform, { maxLength: 80 }) || null;
  const tone = sanitizeText(body.tone, { maxLength: 80 }) || null;
  const topic = sanitizeText(body.topic, { maxLength: 500 }) || null;

  const { data, error } = await supabaseServer
    .from("caption_collection_items")
    .insert({
      collection_id: collectionId,
      user_id: userId,
      caption_text: captionText,
      platform,
      tone,
      topic,
    })
    .select("id, caption_text, platform, tone, topic, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not save to collection.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ item: data });
}
