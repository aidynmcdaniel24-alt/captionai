import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { HistoryPageClient } from "@/components/history/HistoryPageClient";

export const metadata: Metadata = buildPageMetadata({
  title: "Caption history",
  description: "Browse, search and copy your past AI-generated captions on CaptionAI.",
  path: "/history",
  noIndex: true,
});

export default function HistoryPage() {
  return <HistoryPageClient />;
}
