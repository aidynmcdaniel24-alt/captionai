import type { MetadataRoute } from "next";
import { SITE_URL as baseUrl } from "@/lib/site-url";

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
