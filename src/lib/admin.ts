import "server-only";

/** Primary admin Clerk user id (override with CLERK_ADMIN_USER_ID in env when needed). */
export const DEFAULT_CLERK_ADMIN_USER_ID = "user_3DBTV0OWOZNmbg6byLG465ZHpEe";

export function resolveClerkAdminUserId(): string {
  return process.env.CLERK_ADMIN_USER_ID?.trim() || DEFAULT_CLERK_ADMIN_USER_ID;
}

export function isClerkAdminUser(userId: string | undefined): boolean {
  if (!userId) {
    return false;
  }
  return userId === resolveClerkAdminUserId();
}
