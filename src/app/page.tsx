import type { Metadata } from "next";
import { LandingJsonLd } from "@/components/landing/LandingJsonLd";
import { LandingPage } from "@/components/landing/LandingPage";
import { SEO_KEYWORDS } from "@/lib/seo";

const title = "Free AI Caption Generator for Instagram & TikTok | CaptionAI";

const description =
  "Free AI caption generator for Instagram, TikTok, LinkedIn and X. Describe your post, get a caption with hashtags in seconds. Try it now, no signup.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: [...SEO_KEYWORDS],
  authors: [{ name: "CaptionAI" }],
  creator: "CaptionAI",
  publisher: "CaptionAI",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "CaptionAI",
    title,
    description,
    images: [{ url: "/captionai-logo.png", alt: "CaptionAI — AI caption generator" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/captionai-logo.png"],
  },
};

export default function Home() {
  return (
    <>
      <LandingJsonLd />
      <LandingPage />
    </>
  );
}
