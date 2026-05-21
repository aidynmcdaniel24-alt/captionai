import { TermsPage } from "@/components/terms/TermsPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Terms of Service",
  description: "Terms of Service for CaptionAI — AI caption generator, Pro subscriptions, and acceptable use.",
  path: "/terms",
});

export default function Page() {
  return <TermsPage />;
}
