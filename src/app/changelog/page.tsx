import { ChangelogPage } from "@/components/changelog/ChangelogPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Changelog — What's new in CaptionAI",
  description:
    "Changelog for CaptionAI — see the latest features shipped: viral hook library, caption scoring, brand voice, Pro plan, affiliate program, and more.",
  path: "/changelog",
});

export default function Page() {
  return <ChangelogPage />;
}
