import { NextResponse } from "next/server";
import { isProPlan } from "@/lib/plan";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvField(value: string): string {
  const safe = value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "");
  if (/[",\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

type HistoryRow = {
  id: string;
  topic: string | null;
  platform: string | null;
  tone: string | null;
  language: string | null;
  captions: unknown;
  created_at: string;
};

export async function GET(req: Request) {
  const authResult = await requireUser(req, "captions:favorites:export");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "captions:favorites:export",
    RATE_LIMITS.generalApi
  );
  if (rateLimited) return rateLimited;

  const { data: subRow } = await supabaseServer
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  if (!isProPlan(subRow?.plan)) {
    return NextResponse.json(
      {
        error: "CSV export is a Pro feature.",
        proRequired: true,
      },
      { status: 402 }
    );
  }

  const { data: favRows, error: favError } = await supabaseServer
    .from("caption_favorites")
    .select("history_id, caption_index, created_at")
    .eq("user_id", userId);

  if (favError) {
    return NextResponse.json(
      { error: safeErrorMessage(favError, "Could not load favorites.") },
      { status: 500 }
    );
  }

  const ids = Array.from(new Set((favRows ?? []).map((f) => f.history_id as string)));
  let history: HistoryRow[] = [];
  if (ids.length > 0) {
    const { data: histRows, error: histError } = await supabaseServer
      .from("caption_history")
      .select("id, topic, platform, tone, language, captions, created_at")
      .eq("user_id", userId)
      .in("id", ids);
    if (histError) {
      return NextResponse.json(
        { error: safeErrorMessage(histError, "Could not load favorites.") },
        { status: 500 }
      );
    }
    history = (histRows ?? []) as HistoryRow[];
  }

  const indexById = new Map(history.map((h) => [h.id, h] as const));
  const lines: string[] = [
    ["favorited_at", "topic", "platform", "tone", "language", "caption"].join(","),
  ];

  for (const fav of favRows ?? []) {
    const row = indexById.get(fav.history_id as string);
    if (!row || !Array.isArray(row.captions)) continue;
    const text = (row.captions as unknown[])[fav.caption_index as number];
    if (typeof text !== "string" || !text.trim()) continue;
    lines.push(
      [
        String(fav.created_at ?? row.created_at ?? ""),
        row.topic ?? "",
        row.platform ?? "",
        row.tone ?? "",
        row.language ?? "English",
        text,
      ]
        .map(csvField)
        .join(",")
    );
  }

  const body = "\ufeff" + lines.join("\r\n");
  const filename = `captionai-favorites-${new Date().toISOString().split("T")[0]}.csv`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
