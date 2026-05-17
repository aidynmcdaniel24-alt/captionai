import type { Metadata } from "next";
import { LandingJsonLd } from "@/components/landing/LandingJsonLd";
import { LandingPage } from "@/components/landing/LandingPage";
import { SEO_KEYWORDS } from "@/lib/seo";

const title = "CaptionAI — Free AI Caption Generator for Instagram, TikTok & LinkedIn";

const description =
  "Caption generator free for social media captions. Create Instagram captions, TikTok captions, and LinkedIn captions in seconds with our AI caption generator.";

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
