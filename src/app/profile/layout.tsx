import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Your profile",
  description: "CaptionAI profile — plan, usage, referrals, and account settings.",
  path: "/profile",
  noIndex: true,
});

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
