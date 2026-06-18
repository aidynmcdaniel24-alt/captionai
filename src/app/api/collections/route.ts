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
    {
      error: "Caption Collections is a Pro feature. Upgrade to organize your captions.",
      proRequired: true,
    },
    { status: 402 }
  );
}

export async function GET(req: Request) {
  const authResult = await requireUser(req, "collections:list");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "collections:list", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  if (!(await userIsPro(userId))) return proRequiredResponse();

  const { data: collections, error: collectionsError } = await supabaseServer
    .from("caption_collections")
    .select("id, name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (collectionsError) {
    return NextResponse.json(
      { error: safeErrorMessage(collectionsError, "Could not load collections.") },
      { status: 500 }
    );
  }

  const ids = (collections ?? []).map((c) => c.id as string);

  // Optional caption param: report which collections already contain it so the
  // UI can show a "already saved" checkmark. Sanitized the same way items are
  // stored on insert so the equality match is reliable.
  const url = new URL(req.url);
  const captionText = sanitizeText(url.searchParams.get("caption"), {
    maxLength: 4000,
    allowLineBreaks: true,
  });

  // Fetch counts in a single query keyed by collection_id.
  const counts = new Map<string, number>();
  const containsCaption = new Set<string>();
  if (ids.length > 0) {
    const { data: countRows, error: countErr } = await supabaseServer
      .from("caption_collection_items")
      .select("collection_id")
      .eq("user_id", userId)
      .in("collection_id", ids);
    if (!countErr && countRows) {
      for (const row of countRows) {
        const id = row.collection_id as string;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }

    if (captionText) {
      const { data: memberRows } = await supabaseServer
        .from("caption_collection_items")
        .select("collection_id")
        .eq("user_id", userId)
        .eq("caption_text", captionText)
        .in("collection_id", ids);
      for (const row of memberRows ?? []) {
        containsCaption.add(row.collection_id as string);
      }
    }
  }

  const items = (collections ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    created_at: c.created_at as string,
    count: counts.get(c.id as string) ?? 0,
    containsCaption: containsCaption.has(c.id as string),
  }));

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const authResult = await requireUser(req, "collections:create");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "collections:create", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  if (!(await userIsPro(userId))) return proRequiredResponse();

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.default
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const name = sanitizeText(body.name, { maxLength: 80 });
  if (!name) {
    return NextResponse.json({ error: "Collection name is required." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("caption_collections")
    .insert({ user_id: userId, name })
    .select("id, name, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You already have a collection with that name." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not create collection.") },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    created_at: data.created_at,
    count: 0,
  });
}
