import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isClerkAdminUser } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AffiliateEvent =
  | {
      type: "click";
      affiliate_user_id: string;
      code: string;
      timestamp: string;
    }
  | {
      type: "signup";
      affiliate_user_id: string;
      lead_user_id: string;
      timestamp: string;
    }
  | {
      type: "upgrade";
      affiliate_user_id: string;
      earnings: number;
      lead_user_id: string;
      timestamp: string;
      is_test: boolean;
    };

export async function GET() {
  const { userId } = await auth();
  if (!userId || !isClerkAdminUser(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = 50;

  const [statsRes, clicksRes, signupsRes, upgradesRes] = await Promise.all([
    supabaseServer.from("affiliate_stats").select("clicks, signups, paying_customers, earnings_cents"),
    supabaseServer
      .from("affiliate_click_events")
      .select("affiliate_user_id, code, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabaseServer
      .from("affiliate_signup_attributions")
      .select("affiliate_user_id, lead_user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabaseServer
      .from("affiliate_lead_conversion_credited")
      .select("affiliate_user_id, lead_user_id, commission_cents, is_test, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (statsRes.error) {
    return NextResponse.json({ error: statsRes.error.message }, { status: 500 });
  }

  const clicksErr = clicksRes.error;
  const signupsErr = signupsRes.error;
  const upgradesErr = upgradesRes.error;

  if (signupsErr) {
    return NextResponse.json({ error: signupsErr.message }, { status: 500 });
  }
  if (upgradesErr) {
    return NextResponse.json({ error: upgradesErr.message }, { status: 500 });
  }

  const totals = (statsRes.data ?? []).reduce(
    (acc, row) => ({
      clicks: acc.clicks + (row.clicks ?? 0),
      signups: acc.signups + (row.signups ?? 0),
      upgrades: acc.upgrades + (row.paying_customers ?? 0),
      earningsCents: acc.earningsCents + (row.earnings_cents ?? 0),
    }),
    { clicks: 0, signups: 0, upgrades: 0, earningsCents: 0 }
  );

  const events: AffiliateEvent[] = [];

  if (!clicksErr && clicksRes.data) {
    for (const row of clicksRes.data) {
      events.push({
        type: "click",
        affiliate_user_id: row.affiliate_user_id,
        code: row.code,
        timestamp: row.created_at,
      });
    }
  }

  for (const row of signupsRes.data ?? []) {
    events.push({
      type: "signup",
      affiliate_user_id: row.affiliate_user_id,
      lead_user_id: row.lead_user_id,
      timestamp: row.created_at,
    });
  }

  const upgradeRows = upgradesRes.data ?? [];
  const missingAffiliateLeadIds = upgradeRows
    .filter((row) => !row.affiliate_user_id)
    .map((row) => row.lead_user_id);

  const attributionByLead = new Map<string, string>();
  if (missingAffiliateLeadIds.length > 0) {
    const { data: attrRows } = await supabaseServer
      .from("affiliate_signup_attributions")
      .select("lead_user_id, affiliate_user_id")
      .in("lead_user_id", missingAffiliateLeadIds);
    for (const attr of attrRows ?? []) {
      attributionByLead.set(attr.lead_user_id, attr.affiliate_user_id);
    }
  }

  for (const row of upgradeRows) {
    events.push({
      type: "upgrade",
      affiliate_user_id: row.affiliate_user_id ?? attributionByLead.get(row.lead_user_id) ?? "",
      lead_user_id: row.lead_user_id,
      earnings: row.commission_cents ?? 0,
      timestamp: row.created_at,
      is_test: row.is_test === true,
    });
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const items = events.slice(0, limit);

  return NextResponse.json({
    totals,
    items,
    warnings: [
      clicksErr ? `Click events unavailable (${clicksErr.message}). Run supabase/affiliate_admin_events.sql.` : null,
    ].filter(Boolean),
  });
}
