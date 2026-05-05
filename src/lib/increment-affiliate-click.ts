import { supabaseServer } from "@/lib/supabase/server";

/**
 * Count a visit to /r/:code. Prefer RPC (atomic); if PostgREST returns an error
 * (missing execute grant, etc.), fall back to a simple read + upsert.
 */
export async function recordAffiliateLinkClick(rawCode: string): Promise<void> {
  const trimmed = rawCode.trim();
  if (!trimmed) {
    return;
  }

  const { error: rpcError } = await supabaseServer.rpc("increment_affiliate_clicks", {
    p_code: trimmed,
  });

  if (!rpcError) {
    return;
  }

  console.warn("[affiliate click] RPC increment_affiliate_clicks failed:", rpcError.message);

  const codeLower = trimmed.toLowerCase();

  let userId: string | null = null;
  const { data: aff } = await supabaseServer.from("affiliates").select("user_id").eq("code", codeLower).maybeSingle();
  if (aff?.user_id) {
    userId = aff.user_id;
  } else {
    const { data: leg } = await supabaseServer
      .from("referral_codes")
      .select("user_id, code")
      .eq("code", codeLower)
      .maybeSingle();
    if (leg?.user_id) {
      userId = leg.user_id;
      await supabaseServer.from("affiliates").upsert(
        { user_id: leg.user_id, code: leg.code ?? codeLower },
        { onConflict: "user_id" }
      );
      await supabaseServer
        .from("affiliate_stats")
        .upsert({ affiliate_user_id: userId }, { onConflict: "affiliate_user_id" });
    }
  }

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
