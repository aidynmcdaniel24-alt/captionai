import { PricingPage } from "@/components/pricing/PricingPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Pricing — Free, Pro Monthly, Pro Annual",
  description:
    "CaptionAI pricing — start free, upgrade to Pro for unlimited AI captions. Compare Free, Pro monthly ($9/mo), and Pro annual ($79/yr) plans.",
  path: "/pricing",
});

export default function Page() {
  return <PricingPage />;
}
