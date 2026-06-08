import { HowItWorksPage } from "@/components/how-it-works/HowItWorksPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "How it works — CaptionAI Affiliate Program",
  description:
    "Learn how the CaptionAI affiliate program works: get your unique link, share it anywhere, and earn 20% commission on every Pro upgrade. No application, no limits, fast PayPal or Venmo payouts.",
  path: "/how-it-works",
});

export default function Page() {
  return <HowItWorksPage />;
}
