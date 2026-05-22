import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const CLICK_WINDOW_MS = 60_000;
const CLICK_MAX_PER_WINDOW = 10;
const clickHits = new Map<string, { count: number; resetAt: number }>();

function rateLimitClick(ip: string): boolean {
  const now = Date.now();
  const entry = clickHits.get(ip);
  if (!entry || entry.resetAt <= now) {
    clickHits.set(ip, { count: 1, resetAt: now + CLICK_WINDOW_MS });
    if (clickHits.size > 5000) {
      for (const [key, value] of clickHits) {
        if (value.resetAt <= now) clickHits.delete(key);
      }
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= CLICK_MAX_PER_WINDOW;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

async function resolveAffiliateUserId(
  supabase: SupabaseClient,
  lower: string
): Promise<string | null> {
  const { data: byCode } = await supabase.from("affiliates").select("user_id").ilike("code", lower).maybeSingle();
  if (byCode?.user_id) {
    return byCode.user_id;
  }

  const { data: byAlias, error: aliasErr } = await supabase
    .from("affiliates")
    .select("affiliate_user_id")
    .ilike("affiliate_code", lower)
    .maybeSingle();
  if (!aliasErr && byAlias?.affiliate_user_id) {
    return byAlias.affiliate_user_id;
  }

  const { data: legacy } = await supabase.from("referral_codes").select("user_id, code").ilike("code", lower).maybeSingle();

  if (!legacy?.user_id) {
    return null;
  }

  await supabase.from("affiliates").upsert(
    { user_id: legacy.user_id, code: legacy.code ?? lower },
    { onConflict: "user_id" }
  );

  return legacy.user_id;
}

export async function POST(req: Request) {
  const supabase: SupabaseClient = supabaseServer;

  if (!rateLimitClick(clientIp(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { affiliate_code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const affiliate_code = (body.affiliate_code ?? "").toString().trim();
  if (!affiliate_code) {
    return NextResponse.json({ error: "Missing affiliate_code" }, { status: 400 });
  }

  const lower = affiliate_code.toLowerCase();

  const affiliateUserId = await resolveAffiliateUserId(supabase, lower);
  if (!affiliateUserId) {
    return NextResponse.json({ error: "Invalid affiliate code" }, { status: 404 });
  }

  const { error: upsertError } = await supabase.from("affiliate_stats").upsert(
    { affiliate_user_id: affiliateUserId },
    { onConflict: "affiliate_user_id" }
  );

  if (upsertError) {
    console.error("[track-click] upsert:", upsertError);
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 });
  }

  const { error: rpcError } = await supabase.rpc("increment_affiliate_clicks", {
    p_user_id: affiliateUserId,
  });

  if (rpcError) {
    console.error("[track-click] rpc:", rpcError);
    const { data: statsRow } = await supabase
      .from("affiliate_stats")
      .select("clicks")
      .eq("affiliate_user_id", affiliateUserId)
      .maybeSingle();
    const nextClicks = (statsRow?.clicks ?? 0) + 1;
    const now = new Date().toISOString();
    const { error: manualErr } = statsRow
      ? await supabase
          .from("affiliate_stats")
          .update({ clicks: nextClicks, updated_at: now })
          .eq("affiliate_user_id", affiliateUserId)
      : await supabase.from("affiliate_stats").insert({
          affiliate_user_id: affiliateUserId,
          clicks: 1,
          updated_at: now,
        });
    if (manualErr) {
      console.error("[track-click] manual increment:", manualErr.message);
      return NextResponse.json({ error: "Failed to increment" }, { status: 500 });
    }
  }

  const { error: eventErr } = await supabase.from("affiliate_click_events").insert({
    affiliate_user_id: affiliateUserId,
    code: lower,
  });
  if (eventErr) {
    console.warn("[track-click] click event log skipped:", eventErr.message);
  }

  return NextResponse.json({ success: true });
}
