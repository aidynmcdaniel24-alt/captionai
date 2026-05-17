import type { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://captionai.app").trim();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/profile", "/admin", "/api/", "/settings", "/subscription", "/upgrade", "/success", "/cancel", "/affiliate"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
