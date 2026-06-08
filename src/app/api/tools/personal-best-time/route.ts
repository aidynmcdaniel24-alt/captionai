import { NextResponse } from "next/server";
import {
  bestTimeForPlatform,
  personalBestHourLabel,
} from "@/lib/best-time-data";
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
 * Returns research-backed posting windows for a platform plus, when the user
 * has enough caption history (10+ generations), a personalized "best hour"
 * derived from when they actually create content. Available to all plans.
 */
export async function GET(req: Request) {
  const authResult = await requireUser(req, "tools:personal-best-time");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "tools:personal-best-time",
    RATE_LIMITS.generalApi
  );
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(req.url);
  const platform = (searchParams.get("platform") ?? "Instagram").slice(0, 80);
  const research = bestTimeForPlatform(platform);

  let total = 0;
  let personalBestHour: string | null = null;

  try {
    const { data, error } = await supabaseServer
      .from("caption_history")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!error && Array.isArray(data)) {
      total = data.length;
      if (total >= 10) {
        const buckets = new Array<number>(24).fill(0);
        for (const row of data) {
          const t = Date.parse(row.created_at as string);
          if (Number.isNaN(t)) continue;
          const hr = new Date(t).getHours();
          buckets[hr] = (buckets[hr] ?? 0) + 1;
        }
        personalBestHour = personalBestHourLabel(buckets);
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not load posting patterns.") },
      { status: 500 }
    );
  }

  return NextResponse.json({
    platform: research?.platform ?? platform,
    badge: research?.badge ?? null,
    windows: research?.windows ?? [],
    reason: research?.reason ?? null,
    total,
    hasEnoughHistory: total >= 10,
    personalBestHour,
  });
}
