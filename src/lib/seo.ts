import type { Metadata } from "next";

export const SEO_KEYWORDS = [
  "AI caption generator",
  "social media captions",
  "Instagram captions",
  "TikTok captions",
  "LinkedIn captions",
  "caption generator free",
  "CaptionAI",
  "AI captions",
  "Twitter captions",
  "X captions",
] as const;

const defaultOgImage = "/captionai-logo.png";

export function buildPageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const canonical = path.startsWith("/") ? path : `/${path}`;

  return {
    title,
    description,
    keywords: [...SEO_KEYWORDS],
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      siteName: "CaptionAI",
      title,
      description,
      images: [{ url: defaultOgImage, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [defaultOgImage],
    },
  };
}
