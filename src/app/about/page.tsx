import { AboutPage } from "@/components/about/AboutPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "About — Built for creators who'd rather create than caption",
  description:
    "About CaptionAI — we built an AI caption generator so creators spend less time staring at the caption box and more time making the content they love.",
  path: "/about",
});

export default function Page() {
  return <AboutPage />;
}
