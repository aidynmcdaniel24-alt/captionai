import { NextResponse } from "next/server";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import { sanitizeText } from "@/lib/security/sanitize";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HistoryRow = {
  id: string;
  topic: string;
  platform: string;
  tone: string;
  language?: string;
  captions: string[];
  created_at: string;
  ai_ratings?: string[] | null;
  favoriteIndexes?: number[];
  ratings?: Record<string, "worst" | "medium" | "best">;
};

export async function GET(req: Request) {
  const authResult = await requireUser(req, "captions:history");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "captions:history", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const { data, error } = await supabaseServer
    .from("caption_history")
    .select("id, topic, platform, tone, language, captions, created_at, ai_ratings")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      {
        error: "Could not load caption history.",
        details: safeErrorMessage(error, "Database error."),
      },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as Omit<HistoryRow, "favoriteIndexes" | "ratings">[];
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const [favRes, rateRes] = await Promise.all([
    supabaseServer
      .from("caption_favorites")
      .select("history_id, caption_index")
      .eq("user_id", userId)
      .in("history_id", ids),
    supabaseServer
      .from("caption_ratings")
      .select("history_id, caption_index, rating")
      .eq("user_id", userId)
      .in("history_id", ids),
  ]);

  const favByHistory = new Map<string, number[]>();
  for (const f of favRes.data ?? []) {
    const h = f.history_id as string;
    const list = favByHistory.get(h) ?? [];
    list.push(f.caption_index as number);
    favByHistory.set(h, list);
  }

  const rateByHistory = new Map<string, Record<string, "worst" | "medium" | "best">>();
  for (const r of rateRes.data ?? []) {
    const h = r.history_id as string;
    const rec = rateByHistory.get(h) ?? {};
    rec[String(r.caption_index)] = r.rating as "worst" | "medium" | "best";
    rateByHistory.set(h, rec);
  }

  const items: HistoryRow[] = rows.map((row) => {
    let ratings = rateByHistory.get(row.id);
    if (!ratings || Object.keys(ratings).length === 0) {
      const ar = row.ai_ratings;
      if (Array.isArray(ar) && ar.length >= 3) {
        ratings = {
          "0": ar[0] as "worst" | "medium" | "best",
          "1": ar[1] as "worst" | "medium" | "best",
          "2": ar[2] as "worst" | "medium" | "best",
        };
      }
    }
    return {
      ...row,
      language: row.language ?? "English",
      favoriteIndexes: favByHistory.get(row.id) ?? [],
      ratings,
    };
  });

  return NextResponse.json({ items });
}

export async function DELETE(req: Request) {
  const authResult = await requireUser(req, "captions:history:delete");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "captions:history:delete", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(req.url);
  const id = sanitizeText(searchParams.get("id"), { maxLength: 64 });
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("caption_history")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not delete entry.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
