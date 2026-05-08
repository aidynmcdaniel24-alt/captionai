import { headers } from "next/headers";
import { redirect } from "next/navigation";

/** Node runtime so server env and internal fetch behave like production. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ code: string }> };

async function postTrackClick(affiliateCode: string): Promise<void> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (host ? `${proto}://${host}` : null) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000";

  try {
    await fetch(`${origin}/api/track-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ affiliate_code: affiliateCode }),
      cache: "no-store",
    });
  } catch (e) {
    console.error("[r/code] track-click:", e);
  }
}

export default async function ReferralRedirectPage({ params }: Props) {
  const { code } = await params;
  const trimmed = code.trim();
  const safe = encodeURIComponent(trimmed);

  await postTrackClick(trimmed);

  redirect(`/sign-up?ref=${safe}`);
}
