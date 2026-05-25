import { AffiliateLandingPage } from "@/components/affiliate/AffiliateLandingPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Affiliate program — Earn 20% promoting CaptionAI",
  description:
    "Earn 20% commission on every CaptionAI Pro signup you refer. Share your tracking link, watch the stats, get paid via PayPal or Venmo with a $10 minimum.",
  path: "/affiliate",
  noIndex: true,
});

export default function AffiliatePage() {
  return <AffiliateLandingPage />;
}
