import type { MetadataRoute } from "next";
import { SITE_URL as baseUrl } from "@/lib/site-url";

const publicPaths = [
  "/",
  "/how-it-works",
  "/pricing",
  "/faq",
  "/about",
  "/changelog",
  "/privacy",
  "/terms",
  "/support",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return publicPaths.map((path) => ({
    url: `${baseUrl}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
