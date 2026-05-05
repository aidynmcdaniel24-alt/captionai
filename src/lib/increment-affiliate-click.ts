import "server-only";

import { supabaseServer } from "@/lib/supabase/server";

async function resolveAffiliateUserIdForCode(codeLower: string, trimmed: string): Promise<string | null> {
  const { data: affEq } = await supabaseServer.from("affiliates").select("user_id").eq("code", codeLower).maybeSingle();
  if (affEq?.user_id) {
    return affEq.user_id;
  }
  if (trimmed !== codeLower) {
    const { data: affTrim } = await supabaseServer.from("affiliates").select("user_id").eq("code", trimmed).maybeSingle();
    if (affTrim?.user_id) {
      return affTrim.user_id;
    }
  }
  const { data: affIlike } = await supabaseServer.from("affiliates").select("user_id").ilike("code", codeLower).maybeSingle();
  if (affIlike?.user_id) {
    return affIlike.user_id;
  }

  let leg =
    (
      await supabaseServer.from("referral_codes").select("user_id, code").eq("code", codeLower).maybeSingle()
    ).data ?? null;
  if (!leg?.user_id && trimmed !== codeLower) {
    leg =
      (
        await supabaseServer.from("referral_codes").select("user_id, code").eq("code", trimmed).maybeSingle()
      ).data ?? null;
  }
  if (!leg?.user_id) {
    leg =
      (
        await supabaseServer.from("referral_codes").select("user_id, code").ilike("code", codeLower).maybeSingle()
      ).data ?? null;
  }
  if (!leg?.user_id) {
    return null;
  }

  await supabaseServer.from("affiliates").upsert(
    { user_id: leg.user_id, code: leg.code ?? codeLower },
    { onConflict: "user_id" }
  );
  await supabaseServer
    .from("affiliate_stats")
    .upsert({ affiliate_user_id: leg.user_id }, { onConflict: "affiliate_user_id" });

  return leg.user_id;
}

/**
 * Count a visit to /r/:code. Prefer RPC (atomic); if PostgREST returns an error
 * (missing execute grant, etc.), fall back to a simple read + upsert.
 */
export async function recordAffiliateLinkClick(rawCode: string): Promise<void> {
  const trimmed = rawCode.trim();
  if (!trimmed) {
    return;
  }

  const { data: rpcData, error: rpcError } = await supabaseServer.rpc("increment_affiliate_clicks", {
    p_code: trimmed,
  });

  if (!rpcError) {
    return;
  }

  console.warn(
    "[affiliate click] RPC increment_affiliate_clicks failed:",
    rpcError.message,
    rpcError.code,
    rpcError.details,
    "rpcData:",
    rpcData
  );

  const codeLower = trimmed.toLowerCase();
  const userId = await resolveAffiliateUserIdForCode(codeLower, trimmed);

  if (!userId) {
    console.warn("[affiliate click] No affiliate row for code:", codeLower);
    return;
  }

  const { data: stats } = await supabaseServer
    .from("affiliate_stats")
    .select("clicks")
    .eq("affiliate_user_id", userId)
    .maybeSingle();

  const next = (stats?.clicks ?? 0) + 1;
  const now = new Date().toISOString();

  if (stats) {
    const { error: upErr } = await supabaseServer
      .from("affiliate_stats")
      .update({ clicks: next, updated_at: now })
      .eq("affiliate_user_id", userId);
    if (upErr) {
      console.error("[affiliate click] fallback update failed:", upErr.message);
    }
    return;
  }

  const { error: insErr } = await supabaseServer.from("affiliate_stats").insert({
    affiliate_user_id: userId,
    clicks: 1,
    updated_at: now,
  });
  if (insErr) {
    console.error("[affiliate click] fallback insert failed:", insErr.message);
  }
}
