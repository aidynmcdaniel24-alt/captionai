import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/get-app-url";
import { supabaseServer } from "@/lib/supabase/server";

/** Node ensures Clerk + Supabase service role env match production API behavior. */
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
    .select("clicks, signups, paying_customers, earnings_cents")
    .eq("affiliate_user_id", userId)
    .maybeSingle();

  const clicks = statsRow?.clicks ?? 0;
  const signups = statsRow?.signups ?? 0;
  const paying = statsRow?.paying_customers ?? 0;
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

  // Match DB code (same order as /api/track-click). affiliate_stats FK requires a row in affiliates.
  let referrerUserId: string | null = null;

  const { data: byCode } = await supabaseServer.from("affiliates").select("user_id").ilike("code", code).maybeSingle();
  if (byCode?.user_id) {
    referrerUserId = byCode.user_id;
  } else {
    const { data: byAlias, error: aliasErr } = await supabaseServer
      .from("affiliates")
      .select("user_id")
      .ilike("affiliate_code", code)
      .maybeSingle();
    if (!aliasErr && byAlias?.user_id) {
      referrerUserId = byAlias.user_id;
    }
  }

  if (!referrerUserId) {
    const { data: legacy } = await supabaseServer
      .from("referral_codes")
      .select("user_id, code")
      .ilike("code", code)
      .maybeSingle();
    if (legacy?.user_id) {
      referrerUserId = legacy.user_id;
      const { error: syncAffErr } = await supabaseServer.from("affiliates").upsert(
        { user_id: legacy.user_id, code: legacy.code ?? code },
        { onConflict: "user_id" }
      );
      if (syncAffErr) {
        return NextResponse.json({ error: syncAffErr.message }, { status: 500 });
      }
    }
  }

  if (!referrerUserId || referrerUserId === userId) {
    return NextResponse.json({ error: "Invalid referral code." }, { status: 400 });
  }

  const { data: already } = await supabaseServer
    .from("affiliate_signup_attributions")
    .select("lead_user_id")
    .eq("lead_user_id", userId)
    .maybeSingle();

  if (already) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error: attrErr } = await supabaseServer.from("affiliate_signup_attributions").insert({
    affiliate_user_id: referrerUserId,
    lead_user_id: userId,
  });

  if (attrErr) {
    return NextResponse.json({ error: attrErr.message }, { status: 500 });
  }

  const { error: rpcErr } = await supabaseServer.rpc("increment_affiliate_signup", {
    p_referrer_user_id: referrerUserId,
  });

  let statsErr = rpcErr;
  if (statsErr) {
    const { data: signupStats } = await supabaseServer
      .from("affiliate_stats")
      .select("signups")
      .eq("affiliate_user_id", referrerUserId)
      .maybeSingle();

    const now = new Date().toISOString();
    const nextSignups = (signupStats?.signups ?? 0) + 1;

    const { error: manualErr } = signupStats
      ? await supabaseServer
          .from("affiliate_stats")
          .update({ signups: nextSignups, updated_at: now })
          .eq("affiliate_user_id", referrerUserId)
      : await supabaseServer.from("affiliate_stats").insert({
          affiliate_user_id: referrerUserId,
          signups: 1,
          updated_at: now,
        });
    statsErr = manualErr;
  }

  if (statsErr) {
    await supabaseServer.from("affiliate_signup_attributions").delete().eq("lead_user_id", userId);
    return NextResponse.json({ error: statsErr.message }, { status: 500 });
  }

  try {
    await supabaseServer.from("referral_claims").insert({
      referrer_user_id: referrerUserId,
      referred_user_id: userId,
      code,
    });
  } catch {
    /* legacy table optional */
  }

  return NextResponse.json({ ok: true });
}
