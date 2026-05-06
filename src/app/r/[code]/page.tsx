import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/** Node runtime so server env includes the Supabase service-role key. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ code: string }> };

async function recordAffiliateClick(trimmed: string): Promise<void> {
  const lower = trimmed.toLowerCase();

  const { data: aff } = await supabaseServer.from("affiliates").select("user_id").ilike("code", lower).maybeSingle();
  let affiliateUserId = aff?.user_id ?? null;

  if (!affiliateUserId) {
    const { data: leg } = await supabaseServer
      .from("referral_codes")
      .select("user_id, code")
      .ilike("code", lower)
      .maybeSingle();
    if (!leg?.user_id) {
      return;
    }
    affiliateUserId = leg.user_id;
    await supabaseServer.from("affiliates").upsert(
      { user_id: leg.user_id, code: leg.code ?? lower },
      { onConflict: "user_id" }
    );
    await supabaseServer
      .from("affiliate_stats")
      .upsert({ affiliate_user_id: leg.user_id }, { onConflict: "affiliate_user_id" });
  }

  const { data: stats } = await supabaseServer
    .from("affiliate_stats")
    .select("clicks")
    .eq("affiliate_user_id", affiliateUserId)
    .maybeSingle();

  const now = new Date().toISOString();
  const nextClicks = (stats?.clicks ?? 0) + 1;

  if (stats) {
    await supabaseServer
      .from("affiliate_stats")
      .update({ clicks: nextClicks, updated_at: now })
      .eq("affiliate_user_id", affiliateUserId);
    return;
  }

  await supabaseServer.from("affiliate_stats").insert({
    affiliate_user_id: affiliateUserId,
    clicks: 1,
    updated_at: now,
  });
}

export default async function ReferralRedirectPage({ params }: Props) {
  const { code } = await params;
  const trimmed = code.trim();
  const safe = encodeURIComponent(trimmed);

  await recordAffiliateClick(trimmed);

  redirect(`/sign-up?ref=${safe}`);
}
