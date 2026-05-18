import { FaqPage } from "@/components/faq/FaqPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "FAQ — AI Caption Generator Help",
  description:
    "FAQ for CaptionAI: free caption generator, Instagram and TikTok captions, Pro plans, billing, and how our AI social media captions work.",
  path: "/faq",
});

export default function Page() {
  return <FaqPage />;
}
