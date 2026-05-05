import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

type Props = { params: Promise<{ code: string }> };

export default async function ReferralRedirectPage({ params }: Props) {
  const { code } = await params;
  const trimmed = code.trim();
  const safe = encodeURIComponent(trimmed);

  try {
    await supabaseServer.rpc("increment_affiliate_clicks", { p_code: trimmed });
  } catch {
    /* RPC missing until migration — redirect still works */
  }

  redirect(`/sign-up?ref=${safe}`);
}
