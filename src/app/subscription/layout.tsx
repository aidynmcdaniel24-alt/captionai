import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Manage subscription",
  description:
    "View your CaptionAI plan, billing date, and manage Pro subscription — upgrade, switch to annual, or cancel.",
  path: "/subscription",
  noIndex: true,
});

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
