import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

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
      // #region agent log
      fetch("http://127.0.0.1:7679/ingest/774c81b3-4974-4a96-b8a5-09735d7f7aaa", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f63b09" },
        body: JSON.stringify({
          sessionId: "f63b09",
          hypothesisId: "C",
          location: "track-click/route.ts:rpc-fallback",
          message: "click increment failed",
          data: { rpcError: rpcError.message, manualErr: manualErr.message },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
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

  // #region agent log
  fetch("http://127.0.0.1:7679/ingest/774c81b3-4974-4a96-b8a5-09735d7f7aaa", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f63b09" },
    body: JSON.stringify({
      sessionId: "f63b09",
      hypothesisId: "C",
      location: "track-click/route.ts:success",
      message: "click tracked",
      data: { ok: true },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return NextResponse.json({ success: true });
}
