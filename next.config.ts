import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid bundling Groq’s SDK into a broken shape on the server (helps Route Handlers see a working client + env).
  serverExternalPackages: ["groq-sdk"],
};

export default nextConfig;
