import { SUPPORT_EMAIL } from "@/lib/support-contact";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Support & Contact",
  description: `Get help with CaptionAI — AI caption generator for social media captions. Contact ${SUPPORT_EMAIL}.`,
  path: "/support",
});

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
