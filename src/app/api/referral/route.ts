import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/get-app-url";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function randomCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return s;
}

/** Legacy + new table: ensure row exists in referral_codes for older deployments */
async function legacyInsertReferralCode(userId: string, code: string) {
  try {
    await supabaseServer.from("referral_codes").upsert(
      { user_id: userId, code },
      { onConflict: "user_id" }
    );
  } catch {
    /* table may be absent */
  }
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabaseServer.from("affiliates").select("code").eq("user_id", userId).maybeSingle();

  let code = existing?.code;
  if (!code) {
    const { data: legacy } = await supabaseServer
      .from("referral_codes")
      .select("code")
      .eq("user_id", userId)
      .maybeSingle();
    if (legacy?.code) {
      const { error: syncErr } = await supabaseServer.from("affiliates").insert({ user_id: userId, code: legacy.code });
      if (!syncErr) {
        await supabaseServer
          .from("affiliate_stats")
          .upsert({ affiliate_user_id: userId }, { onConflict: "affiliate_user_id" });
        code = legacy.code;
      }
    }
  }
  if (!code) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const tryCode = randomCode();
      const { data: taken } = await supabaseServer.from("affiliates").select("code").eq("code", tryCode).maybeSingle();
      if (taken) {
        continue;
      }
      const { error: insAff } = await supabaseServer.from("affiliates").insert({ user_id: userId, code: tryCode });
      if (!insAff) {
        await supabaseServer.from("affiliate_stats").upsert(
          { affiliate_user_id: userId },
          { onConflict: "affiliate_user_id" }
        );
        await legacyInsertReferralCode(userId, tryCode);
        code = tryCode;
        break;
      }
    }
  }

  if (!code) {
    return NextResponse.json({ error: "Could not allocate referral code." }, { status: 500 });
  }

  const base = getAppUrl(req);
  const trackingPath = `/r/${encodeURIComponent(code)}`;
  const trackingLink = `${base}${trackingPath}`;
  const linkWithQuery = `${base}/sign-up?ref=${encodeURIComponent(code)}`;

  const { data: statsRow } = await supabaseServer
    .from("affiliate_stats")
    .select("total_clicks, total_signups, total_paying, earnings_cents")
    .eq("affiliate_user_id", userId)
    .maybeSingle();

  const clicks = statsRow?.total_clicks ?? 0;
  const signups = statsRow?.total_signups ?? 0;
  const paying = statsRow?.total_paying ?? 0;
  const earningsCents = statsRow?.earnings_cents ?? 0;

  return NextResponse.json({
    code,
    link: linkWithQuery,
    trackingLink,
    referralsCount: signups,
    stats: {
      totalClicks: clicks,
      totalSignups: signups,
      totalPayingCustomers: paying,
      earningsCents,
      earningsFormatted: (earningsCents / 100).toFixed(2),
    },
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const code = (body.code ?? "").toString().trim().toLowerCase();
  if (!code) {
    return NextResponse.json({ error: "Missing code." }, { status: 400 });
  }

  // Match DB code case-insensitively (legacy rows may differ in casing).
  let { data: row } = await supabaseServer.from("affiliates").select("user_id").ilike("code", code).maybeSingle();
  if (!row?.user_id) {
    const { data: legacy } = await supabaseServer
      .from("referral_codes")
      .select("user_id")
      .ilike("code", code)
      .maybeSingle();
    if (legacy?.user_id) {
      row = { user_id: legacy.user_id };
    }
  }

  if (!row?.user_id || row.user_id === userId) {
    return NextResponse.json({ error: "Invalid referral code." }, { status: 400 });
  }

  const { data: already } = await supabaseServer
    .from("affiliate_signup_attributions")
    .select("id")
    .eq("referred_user_id", userId)
    .maybeSingle();

  if (already) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error: attrErr } = await supabaseServer.from("affiliate_signup_attributions").insert({
    referrer_user_id: row.user_id,
    referred_user_id: userId,
    code,
  });

  if (attrErr) {
    return NextResponse.json({ error: attrErr.message }, { status: 500 });
  }

  const { error: rpcErr } = await supabaseServer.rpc("increment_affiliate_signup", {
    p_referrer_user_id: row.user_id,
  });

  if (rpcErr) {
    console.error("[referral] increment_affiliate_signup:", rpcErr.message);
    await supabaseServer.from("affiliate_signup_attributions").delete().eq("referred_user_id", userId);
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }

  try {
    await supabaseServer.from("referral_claims").insert({
      referrer_user_id: row.user_id,
      referred_user_id: userId,
      code,
    });
  } catch {
    /* legacy table optional */
  }

  return NextResponse.json({ ok: true });
}
