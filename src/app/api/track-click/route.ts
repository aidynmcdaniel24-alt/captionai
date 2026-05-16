import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createServiceRoleClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\s"]/g, "");
  if (!supabaseUrl || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for click tracking.");
  }
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
  let supabase: SupabaseClient;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    console.error("[track-click]", e);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
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
    return NextResponse.json({ error: "Failed to increment" }, { status: 500 });
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
