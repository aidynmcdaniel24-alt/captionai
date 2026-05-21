import { SupportPage } from "@/components/support/SupportPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Support — CaptionAI Help Center",
  description:
    "Get help with CaptionAI. Email support, browse the FAQ, or send our team a message — we respond within 24 hours.",
  path: "/support",
});

export default function Page() {
  return <SupportPage />;
}
