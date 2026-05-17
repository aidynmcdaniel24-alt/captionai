import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Sign in",
  description: "Sign in to CaptionAI — free AI caption generator for Instagram, TikTok, and LinkedIn captions.",
  path: "/sign-in",
});

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
