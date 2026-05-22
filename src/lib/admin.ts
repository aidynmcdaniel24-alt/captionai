import "server-only";
import { currentUser } from "@clerk/nextjs/server";

/** Strip quotes / whitespace from Vercel env values (e.g. `"user_abc"`). */
function normalizeClerkUserId(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "").trim();
}

function parseAdminIdsFromEnv(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(/[,;\s]+/)
    .map(normalizeClerkUserId)
    .filter((id) => id.startsWith("user_"));
}

/**
 * Clerk user IDs allowed to access /admin and admin APIs.
 * CLERK_ADMIN_USER_ID: one id or comma-separated list.
 * Returns [] when unset — admin access is then controlled only by CLERK_ADMIN_EMAIL.
 */
export function resolveClerkAdminUserIds(): string[] {
  return parseAdminIdsFromEnv(process.env.CLERK_ADMIN_USER_ID);
}

export function isClerkAdminUser(userId: string | undefined): boolean {
  if (!userId) {
    return false;
  }
  const normalized = normalizeClerkUserId(userId);
  const ids = resolveClerkAdminUserIds();
  if (ids.length === 0) {
    return false;
  }
  return ids.some((adminId) => adminId === normalized);
}

/** Optional email allowlist (CLERK_ADMIN_EMAIL), case-insensitive. */
export function isClerkAdminEmail(email: string | undefined | null): boolean {
  const allowed = process.env.CLERK_ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowed || !email) {
    return false;
  }
  return email.trim().toLowerCase() === allowed.replace(/^["']|["']$/g, "");
}

/** User id match, or optional CLERK_ADMIN_EMAIL match for signed-in user. */
export async function resolveIsClerkAdmin(userId: string | undefined): Promise<boolean> {
  if (!userId) {
    return false;
  }
  if (isClerkAdminUser(userId)) {
    return true;
  }
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;
  return isClerkAdminEmail(email);
}
