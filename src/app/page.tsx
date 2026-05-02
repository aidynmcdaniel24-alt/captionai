import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

const title =
  "CaptionAI — AI captions for Instagram, TikTok, LinkedIn & more";

const description =
  "Generate scroll-stopping social captions in seconds. Try a free live demo, then sign up for Pro for unlimited AI caption generations.";

const keywords = [
  "CaptionAI",
  "AI captions",
  "Instagram captions",
  "TikTok captions",
  "social media captions",
  "LinkedIn captions",
  "Twitter captions",
  "X captions",
  "caption generator",
  "AI copywriting",
  "content creator tools",
];

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  keywords,
  authors: [{ name: "CaptionAI" }],
  creator: "CaptionAI",
  publisher: "CaptionAI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "CaptionAI",
    title,
    description,
    images: [
      {
        url: "/captionai-logo.png",
        alt: "CaptionAI — AI-powered social media captions",
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/captionai-logo.png"],
  },
};

export default function Home() {
  return <LandingPage />;
}
