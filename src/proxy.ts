import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/profile(.*)",
  "/affiliate(.*)",
  "/subscription(.*)",
  "/upgrade(.*)",
  "/settings(.*)",
  "/success(.*)",
  "/admin(.*)",
]);

/**
 * Cross-origin policy: only the production deployment and local dev
 * servers may call our /api/* routes from a browser. Server-to-server
 * webhooks (Stripe, Clerk) don't send an Origin header so they always
 * pass through.
 */
const ALLOWED_ORIGINS = new Set<string>([
  "https://captionai-phi.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-clerk-auth-status, svix-id, svix-timestamp, svix-signature, stripe-signature",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function isWebhookPath(pathname: string): boolean {
  return pathname.startsWith("/api/webhooks/");
}

function handleCors(req: NextRequest): NextResponse | undefined {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return undefined;
  // Webhooks come from Stripe / Clerk infra (no browser Origin header).
  if (isWebhookPath(pathname)) return undefined;

  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  // Same-origin or no-origin requests don't trigger CORS at the browser; let them pass.
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return NextResponse.json(
      { error: "Origin not allowed." },
      { status: 403 }
    );
  }

  return undefined;
}

export default clerkMiddleware(async (auth, req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
