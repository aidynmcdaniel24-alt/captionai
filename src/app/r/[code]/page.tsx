import { redirect } from "next/navigation";
import { recordAffiliateLinkClick } from "@/lib/increment-affiliate-click";

/** Must run per-request with Node so env has service-role key; Edge often lacks it → anon key → RPC/RLS fails. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ code: string }> };

export default async function ReferralRedirectPage({ params }: Props) {
  const { code } = await params;
  const trimmed = code.trim();
  const safe = encodeURIComponent(trimmed);

  // Await full round-trip so the click is recorded before the redirect response is sent.
  await recordAffiliateLinkClick(trimmed);

  redirect(`/sign-up?ref=${safe}`);
}
