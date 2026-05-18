import { PrivacyPage } from "@/components/privacy/PrivacyPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "CaptionAI privacy policy — how we handle data when you use our AI caption generator and social media caption tools.",
  path: "/privacy",
});

export default function Page() {
  return <PrivacyPage />;
}
