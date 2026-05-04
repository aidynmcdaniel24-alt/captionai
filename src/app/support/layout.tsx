import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/support-contact";

export const metadata: Metadata = {
  title: "Support",
  description: `Contact CaptionAI — ${SUPPORT_EMAIL} and contact form.`,
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
