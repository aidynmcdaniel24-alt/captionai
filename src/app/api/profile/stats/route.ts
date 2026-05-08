import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isClerkAdminUser } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayUtc() {
  return new Date().toISOString().split("T")[0]!;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sub } = await supabaseServer
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  const plan = sub?.plan === "pro" ? "pro" : "free";

  let totalCaptions = 0;
  const { count, error: countError } = await supabaseServer
    .from("caption_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (!countError && typeof count === "number") {
    totalCaptions = count;
  }

  const date = todayUtc();
  const { data: usageRow } = await supabaseServer
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  let referralsCount = 0;
  const { count: refCount, error: refErr } = await supabaseServer
    .from("affiliate_signup_attributions")
    .select("*", { count: "exact", head: true })
    .eq("affiliate_user_id", userId);
  if (!refErr && typeof refCount === "number") {
    referralsCount = refCount;
  } else {
    const { count: legacyCount, error: legErr } = await supabaseServer
      .from("referral_claims")
      .select("*", { count: "exact", head: true })
      .eq("referrer_user_id", userId);
    if (!legErr && typeof legacyCount === "number") {
      referralsCount = legacyCount;
    }
  }

  let abSummary = { experiments: 0, totalPicks: 0 };
  const { data: abRows, error: abErr } = await supabaseServer
    .from("ab_experiments")
    .select("picks_a, picks_b")
    .eq("user_id", userId);

  if (!abErr && abRows?.length) {
    abSummary = {
      experiments: abRows.length,
      totalPicks: abRows.reduce((s, r) => s + (r.picks_a ?? 0) + (r.picks_b ?? 0), 0),
    };
  }

  return NextResponse.json({
    plan,
    totalCaptions,
    usageToday: usageRow?.count ?? 0,
    freeLimit: 5,
    referralsCount,
    abSummary,
    isAdmin: isClerkAdminUser(userId),
  });
}
