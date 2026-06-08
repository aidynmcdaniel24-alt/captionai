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

type HistoryRow = {
  id: string;
  topic: string | null;
  platform: string | null;
  tone: string | null;
  language: string | null;
  captions: unknown;
  created_at: string;
};

type CountedItem = { name: string; value: number };

function countBy(rows: HistoryRow[], key: keyof HistoryRow): CountedItem[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = row[key];
    const name = (typeof raw === "string" ? raw : "")?.trim() || "Unspecified";
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

function startOfThisWeek(now: Date): number {
  // Treat Monday as the first day of the week (matches most analytics dashboards).
  const local = new Date(now);
  const day = local.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() - offset);
  return local.getTime();
}

export async function GET(req: Request) {
  const authResult = await requireUser(req, "analytics:captions");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "analytics:captions",
    RATE_LIMITS.generalApi
  );
  if (rateLimited) return rateLimited;

  const { data: subRow } = await supabaseServer
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  const plan: "free" | "pro" | "annual" =
    subRow?.plan === "annual" ? "annual" : subRow?.plan === "pro" ? "pro" : "free";

  // Free users get the empty payload — the UI shows a blurred preview instead.
  if (!isProPlan(plan)) {
    return NextResponse.json({
      plan,
      proRequired: true,
      total: 0,
      thisWeek: 0,
      lastWeek: 0,
      platforms: [],
      tones: [],
      languages: [],
      topCopied: [],
      bestHourLabel: null,
      hourBuckets: [],
      favoritesCount: 0,
      mostUsedPlatform: null,
      favoriteTone: null,
      topTopics: [],
    });
  }

  const { data: rowsData, error } = await supabaseServer
    .from("caption_history")
    .select("id, topic, platform, tone, language, captions, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not load analytics.") },
      { status: 500 }
    );
  }

  const rows = (rowsData ?? []) as HistoryRow[];
  const total = rows.length;

  const now = new Date();
  const weekStart = startOfThisWeek(now);
  const lastWeekStart = weekStart - 7 * 24 * 60 * 60 * 1000;

  let thisWeek = 0;
  let lastWeek = 0;
  const hourBuckets = new Array<number>(24).fill(0);

  for (const row of rows) {
    const t = Date.parse(row.created_at);
    if (Number.isNaN(t)) continue;
    if (t >= weekStart) thisWeek++;
    else if (t >= lastWeekStart) lastWeek++;
    const hour = new Date(t).getUTCHours();
    hourBuckets[hour] = (hourBuckets[hour] ?? 0) + 1;
  }

  const bestHour = hourBuckets.reduce(
    (best, value, idx) => (value > best.value ? { value, idx } : best),
    { value: 0, idx: 0 }
  );
  const bestHourLabel =
    bestHour.value === 0
      ? null
      : `${String(bestHour.idx).padStart(2, "0")}:00 UTC`;

  const platforms = countBy(rows, "platform");
  const tones = countBy(rows, "tone");
  const languages = countBy(rows, "language");
  const topics = countBy(rows, "topic");

  const mostUsedPlatform = platforms[0]?.name ?? null;
  const favoriteTone = tones[0]?.name ?? null;
  const topTopics = topics.slice(0, 5).map((t) => t.name);

  // Caption Memory: prefer real copy events from caption_copies; fall back to favorites.
  const { data: copyRows } = await supabaseServer
    .from("caption_copies")
    .select("caption_text, platform, tone, topic, score, copied_at")
    .eq("user_id", userId)
    .order("copied_at", { ascending: false })
    .limit(500);

  const { data: favRows } = await supabaseServer
    .from("caption_favorites")
    .select("history_id, caption_index")
    .eq("user_id", userId);

  const favCount = favRows?.length ?? 0;
  const copiesCount = copyRows?.length ?? 0;

  // Personalize platform/tone from copies when we have enough history.
  let memoryPlatform = mostUsedPlatform;
  let memoryTone = favoriteTone;
  if (copyRows && copyRows.length >= 3) {
    const platMap = new Map<string, number>();
    const toneMap = new Map<string, number>();
    for (const c of copyRows) {
      const p = (c.platform as string)?.trim();
      const t = (c.tone as string)?.trim();
      if (p) platMap.set(p, (platMap.get(p) ?? 0) + 1);
      if (t) toneMap.set(t, (toneMap.get(t) ?? 0) + 1);
    }
    const topPlat = [...platMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const topTone = [...toneMap.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topPlat) memoryPlatform = topPlat[0];
    if (topTone) memoryTone = topTone[0];
  }

  const topCopied: { caption: string; platform: string; tone: string; favoriteCount: number }[] =
    [];

  if (copyRows && copyRows.length > 0) {
    const counter = new Map<string, number>();
    const example = new Map<string, { caption: string; platform: string; tone: string }>();
    for (const row of copyRows) {
      const text = (row.caption_text as string)?.trim();
      if (!text) continue;
      counter.set(text, (counter.get(text) ?? 0) + 1);
      if (!example.has(text)) {
        example.set(text, {
          caption: text,
          platform: (row.platform as string) ?? "—",
          tone: (row.tone as string) ?? "—",
        });
      }
    }
    const sorted = [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [text, count] of sorted) {
      const ex = example.get(text);
      if (ex) topCopied.push({ ...ex, favoriteCount: count });
    }
  } else if (favRows && favRows.length > 0) {
    const counter = new Map<string, number>();
    const example = new Map<
      string,
      { caption: string; platform: string; tone: string }
    >();
    for (const fav of favRows) {
      const row = rows.find((r) => r.id === fav.history_id);
      if (!row || !Array.isArray(row.captions)) continue;
      const text = (row.captions as unknown[])[fav.caption_index as number];
      if (typeof text !== "string" || !text.trim()) continue;
      counter.set(text, (counter.get(text) ?? 0) + 1);
      if (!example.has(text)) {
        example.set(text, {
          caption: text,
          platform: row.platform ?? "—",
          tone: row.tone ?? "—",
        });
      }
    }
    const sorted = Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    for (const [text, count] of sorted) {
      const ex = example.get(text);
      if (ex) topCopied.push({ ...ex, favoriteCount: count });
    }
  }

  return NextResponse.json({
    plan,
    proRequired: false,
    total,
    thisWeek,
    lastWeek,
    platforms,
    tones,
    languages,
    topCopied,
    bestHourLabel,
    hourBuckets,
    favoritesCount: favCount,
    copiesCount,
    mostUsedPlatform: memoryPlatform,
    favoriteTone: memoryTone,
    topTopics,
  });
}
