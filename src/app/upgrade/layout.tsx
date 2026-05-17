import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Upgrade to Pro",
  description:
    "Upgrade CaptionAI to Pro — unlimited AI caption generator for Instagram, TikTok, and LinkedIn. $9/month or $79/year.",
  path: "/upgrade",
  noIndex: true,
});

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
