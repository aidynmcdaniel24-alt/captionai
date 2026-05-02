import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/upgrade(.*)",
  "/settings(.*)",
  "/profile(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

/**
 * Do not run Clerk on `/api/*`. Including API routes caused Edge proxy failures on Vercel
 * (MIDDLEWARE_INVOCATION_FAILED) — e.g. webhooks and JSON APIs don't need session handling here;
 * each route uses `auth()` when required.
 */
export const config = {
  matcher: [
    "/((?!api/|_next/|[^?]*\\.[\\w]+$|favicon.ico).*)",
    "/",
  ],
};
