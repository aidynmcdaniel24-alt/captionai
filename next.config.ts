import type { NextConfig } from "next";

/**
 * Content Security Policy
 *
 * Only third-party origins we actually depend on are allowed. If you add a
 * new vendor (analytics, fonts, image host) update both `script-src` /
 * `style-src` (where the asset is loaded from) and `connect-src` (where the
 * client opens XHR / fetch / websocket connections).
 *
 * NOTE: Next.js + Clerk + framer-motion all rely on inline styles, and the
 *       Next.js runtime evaluates inline scripts for hydration. That's why
 *       `'unsafe-inline'` (and `'unsafe-eval'` for script-src) are still
 *       present — removing them would break the app. They are the de facto
 *       Next.js default until full nonce support is configured per-route.
 */
const CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://clerk.com",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
    "https://js.stripe.com",
    "https://challenges.cloudflare.com",
  ],
  "style-src": [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
  ],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://img.clerk.com",
    "https://images.clerk.dev",
    "https://*.clerk.com",
    "https://*.stripe.com",
    "https://*.supabase.co",
  ],
  "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
  "connect-src": [
    "'self'",
    "https://clerk.com",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
    "https://*.supabase.co",
    "https://api.stripe.com",
    "https://api.groq.com",
  ],
  "frame-src": [
    "https://challenges.cloudflare.com",
    "https://*.clerk.com",
    "https://js.stripe.com",
    "https://hooks.stripe.com",
  ],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'", "https://*.stripe.com"],
  "object-src": ["'none'"],
  "worker-src": ["'self'", "blob:"],
  "upgrade-insecure-requests": [],
};

const cspString = Object.entries(CSP_DIRECTIVES)
  .map(([directive, sources]) =>
    sources.length > 0 ? `${directive} ${sources.join(" ")}` : directive
  )
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspString },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // Avoid bundling Groq’s SDK into a broken shape on the server (helps Route Handlers see a working client + env).
  serverExternalPackages: ["groq-sdk"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
