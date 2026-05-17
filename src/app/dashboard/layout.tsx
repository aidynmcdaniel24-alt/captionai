import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Dashboard — AI Caption Studio",
  description:
    "Generate Instagram, TikTok, and LinkedIn captions with our AI caption generator. Pick platform, tone, and get 3 captions instantly.",
  path: "/dashboard",
  noIndex: true,
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
