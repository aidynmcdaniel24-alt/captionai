import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support",
  description: "Contact CaptionAI — support@captionai.com and contact form.",
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
