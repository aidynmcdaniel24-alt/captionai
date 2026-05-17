import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Sign up free",
  description:
    "Create a free CaptionAI account — AI caption generator for social media captions on Instagram, TikTok, and LinkedIn.",
  path: "/sign-up",
});

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
