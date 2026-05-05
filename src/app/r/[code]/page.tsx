import { redirect } from "next/navigation";
import { recordAffiliateLinkClick } from "@/lib/increment-affiliate-click";

type Props = { params: Promise<{ code: string }> };

export default async function ReferralRedirectPage({ params }: Props) {
  const { code } = await params;
  const trimmed = code.trim();
  const safe = encodeURIComponent(trimmed);

  await recordAffiliateLinkClick(trimmed);

  redirect(`/sign-up?ref=${safe}`);
}
