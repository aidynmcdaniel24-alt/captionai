import type { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://captionai.app").trim();

const publicPaths = [
  "/",
  "/pricing",
  "/about",
  "/changelog",
  "/faq",
  "/privacy",
  "/terms",
  "/support",
  "/sign-in",
  "/sign-up",
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
