import { NextResponse } from "next/server";
import { ADMIN_EVENTS } from "@/lib/admin-log";
import { resolveIsClerkAdmin } from "@/lib/admin";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ModerationLogRow = {
  id: string;
  created_at: string;
  topic: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  user_id: string | null;
  feature: string;
};

export type ModerationStats = {
  blockedToday: number;
  blockedAllTime: number;
  topTopics: Array<{ topic: string; count: number }>;
  topReasons: Array<{ reason: string; count: number }>;
};

type RawMeta = {
  topic?: unknown;
  reason?: unknown;
  confidence?: unknown;
  user_id?: unknown;
  feature?: unknown;
  source?: unknown;
  timestamp?: unknown;
};

function normaliseConfidence(raw: unknown): "high" | "medium" | "low" {
  return raw === "high" || raw === "medium" || raw === "low" ? raw : "medium";
}

function asString(raw: unknown, fallback = ""): string {
  return typeof raw === "string" ? raw : fallback;
}

function toRow(record: {
  id: string;
  created_at: string;
  meta: RawMeta | null;
}): ModerationLogRow {
  const meta = record.meta ?? {};
  return {
    id: record.id,
    created_at: record.created_at,
    topic: asString(meta.topic),
    reason: asString(meta.reason, "Blocked by moderation."),
    confidence: normaliseConfidence(meta.confidence),
    user_id: typeof meta.user_id === "string" ? meta.user_id : null,
    feature: asString(meta.feature, "unknown"),
  };
}

function topByKey<K extends string>(
  rows: ModerationLogRow[],
  pick: (row: ModerationLogRow) => K | null,
  limit = 5
): Array<{ key: K; count: number }> {
  const counts = new Map<K, number>();
  for (const row of rows) {
    const k = pick(row);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

const MAX_RECENT = 50;
// Pull a wider window for the "top topics / top reasons" aggregation so the
// rankings reflect more than just the visible 50 rows.
const AGGREGATE_WINDOW = 1000;

export async function GET(req: Request) {
  const authResult = await requireUser(req, "admin:moderation");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  if (!(await resolveIsClerkAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimited = rateLimitByUser(userId, "admin:moderation", RATE_LIMITS.adminApi);
  if (rateLimited) return rateLimited;

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [recentRes, aggregateRes, todayCountRes, allTimeCountRes] = await Promise.all([
    supabaseServer
      .from("admin_logs")
      .select("id, created_at, meta")
      .eq("message", ADMIN_EVENTS.CONTENT_MODERATED)
      .order("created_at", { ascending: false })
      .limit(MAX_RECENT),
    supabaseServer
      .from("admin_logs")
      .select("id, created_at, meta")
      .eq("message", ADMIN_EVENTS.CONTENT_MODERATED)
      .order("created_at", { ascending: false })
      .limit(AGGREGATE_WINDOW),
    supabaseServer
      .from("admin_logs")
      .select("*", { count: "exact", head: true })
      .eq("message", ADMIN_EVENTS.CONTENT_MODERATED)
      .gte("created_at", startOfToday.toISOString()),
    supabaseServer
      .from("admin_logs")
      .select("*", { count: "exact", head: true })
      .eq("message", ADMIN_EVENTS.CONTENT_MODERATED),
  ]);

  if (recentRes.error) {
    return NextResponse.json(
      { error: safeErrorMessage(recentRes.error, "Could not load moderation events.") },
      { status: 500 }
    );
  }

  const warnings: string[] = [];
  if (aggregateRes.error) warnings.push(`aggregate: ${aggregateRes.error.message}`);
  if (todayCountRes.error) warnings.push(`today: ${todayCountRes.error.message}`);
  if (allTimeCountRes.error) warnings.push(`all-time: ${allTimeCountRes.error.message}`);

  const recent: ModerationLogRow[] = (recentRes.data ?? []).map((d) =>
    toRow({
      id: d.id as string,
      created_at: d.created_at as string,
      meta: (d.meta ?? null) as RawMeta | null,
    })
  );

  const aggregateRows: ModerationLogRow[] = (aggregateRes.data ?? []).map((d) =>
    toRow({
      id: d.id as string,
      created_at: d.created_at as string,
      meta: (d.meta ?? null) as RawMeta | null,
    })
  );

  const topTopicsRaw = topByKey(
    aggregateRows,
    (row) => {
      const t = row.topic.trim().toLowerCase().slice(0, 80);
      return t.length > 0 ? t : null;
    }
  );
  const topReasonsRaw = topByKey(
    aggregateRows,
    (row) => {
      const r = row.reason.trim().toLowerCase().slice(0, 120);
      return r.length > 0 ? r : null;
    }
  );

  const stats: ModerationStats = {
    blockedToday: todayCountRes.count ?? 0,
    blockedAllTime: allTimeCountRes.count ?? 0,
    topTopics: topTopicsRaw.map(({ key, count }) => ({ topic: key, count })),
    topReasons: topReasonsRaw.map(({ key, count }) => ({ reason: key, count })),
  };

  return NextResponse.json({
    items: recent,
    stats,
    warnings,
  });
}

export async function DELETE(req: Request) {
  const authResult = await requireUser(req, "admin:moderation:delete");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  if (!(await resolveIsClerkAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimited = rateLimitByUser(
    userId,
    "admin:moderation:delete",
    RATE_LIMITS.adminApi
  );
  if (rateLimited) return rateLimited;

  const { error } = await supabaseServer
    .from("admin_logs")
    .delete()
    .eq("message", ADMIN_EVENTS.CONTENT_MODERATED);

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not clear moderation logs.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
