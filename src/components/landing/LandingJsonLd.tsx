const siteUrl = (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://captionai.app").trim();

export function LandingJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "CaptionAI",
        description:
          "Free AI caption generator for Instagram, TikTok, LinkedIn, and more. Generate social media captions in seconds.",
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#app`,
        name: "CaptionAI",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free tier with 200 daily tokens; Pro (1,000/day) and Annual (unlimited) plans available.",
        },
        description:
          "AI caption generator for social media — create Instagram captions, TikTok captions, and LinkedIn captions with one click.",
        url: siteUrl,
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "CaptionAI",
        url: siteUrl,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
