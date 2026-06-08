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

function proRequiredResponse(): NextResponse {
  return NextResponse.json(
    { error: "Caption Collections is a Pro feature.", proRequired: true },
    { status: 402 }
  );
}

async function ensureOwnership(userId: string, collectionId: string) {
  const { data } = await supabaseServer
    .from("caption_collections")
    .select("id, user_id, name")
    .eq("id", collectionId)
    .maybeSingle();
  if (!data || data.user_id !== userId) return null;
  return data;
}

export async function GET(req: Request, ctx: RouteContext) {
  const authResult = await requireUser(req, "collections:get");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "collections:get", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  if (!(await userIsPro(userId))) return proRequiredResponse();

  const { id } = await ctx.params;
  const collectionId = sanitizeText(id, { maxLength: 64 });
  const collection = await ensureOwnership(userId, collectionId);
  if (!collection) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: items, error } = await supabaseServer
    .from("caption_collection_items")
    .select("id, caption_text, platform, tone, topic, created_at")
    .eq("collection_id", collectionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not load collection items.") },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: collection.id,
    name: collection.name,
    items: items ?? [],
  });
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const authResult = await requireUser(req, "collections:rename");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "collections:rename", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  if (!(await userIsPro(userId))) return proRequiredResponse();

  const { id } = await ctx.params;
  const collectionId = sanitizeText(id, { maxLength: 64 });
  const owned = await ensureOwnership(userId, collectionId);
  if (!owned) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.default
  );
  if (!bodyResult.ok) return bodyResult.response;

  const name = sanitizeText(bodyResult.data.name, { maxLength: 80 });
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("caption_collections")
    .update({ name })
    .eq("id", collectionId)
    .eq("user_id", userId);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You already have a collection with that name." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not rename collection.") },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, id: collectionId, name });
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const authResult = await requireUser(req, "collections:delete");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "collections:delete", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  if (!(await userIsPro(userId))) return proRequiredResponse();

  const { id } = await ctx.params;
  const collectionId = sanitizeText(id, { maxLength: 64 });
  const owned = await ensureOwnership(userId, collectionId);
  if (!owned) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { error } = await supabaseServer
    .from("caption_collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not delete collection.") },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
