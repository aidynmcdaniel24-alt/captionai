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

/**
 * Convert a list of caption history rows into a properly-quoted CSV. We
 * keep the format intentionally simple — date, topic, platform, tone,
 * language, then up to three caption columns — so it imports cleanly
 * into Excel, Google Sheets, and Notion.
 */
function toCsv(rows: HistoryRow[]): string {
  const header = [
    "date",
    "topic",
    "platform",
    "tone",
    "language",
    "caption_1",
    "caption_2",
    "caption_3",
  ];

  const lines: string[] = [header.join(",")];
  for (const row of rows) {
    const captions = Array.isArray(row.captions) ? row.captions : [];
    const fields = [
      row.created_at ?? "",
      row.topic ?? "",
      row.platform ?? "",
      row.tone ?? "",
      row.language ?? "English",
      String(captions[0] ?? ""),
      String(captions[1] ?? ""),
      String(captions[2] ?? ""),
    ];
    lines.push(fields.map(csvField).join(","));
  }
  return lines.join("\r\n");
}

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
  const authResult = await requireUser(req, "captions:history:export");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "captions:history:export",
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

  const { data, error } = await supabaseServer
    .from("caption_history")
    .select("id, topic, platform, tone, language, captions, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not export history.") },
      { status: 500 }
    );
  }

  const csv = toCsv((data ?? []) as HistoryRow[]);
  // Prepend a UTF-8 BOM so Excel decodes emoji and accents correctly.
  const body = "\ufeff" + csv;
  const filename = `captionai-history-${new Date().toISOString().split("T")[0]}.csv`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
