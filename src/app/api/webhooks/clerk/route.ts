import { clerkClient } from "@clerk/nextjs/server";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { logAdminEvent } from "@/lib/admin-log";
import {
  DISPOSABLE_EMAIL_ERROR_MESSAGE,
  isDisposableEmail,
} from "@/lib/security/disposable-emails";
import { readTextWithLimit } from "@/lib/security/request-size";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BYTES = 64 * 1024;

type ClerkEmailAddress = {
  id?: string;
  email_address?: string;
};

type ClerkUserPayload = {
  id?: string;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string;
};

type ClerkWebhookEvent = {
  type?: string;
  data?: ClerkUserPayload;
};

/**
 * Verify a Clerk (Svix) webhook signature without bringing in the
 * `svix` package. Clerk signs `${id}.${timestamp}.${body}` with the
 * raw secret bytes (after stripping the `whsec_` prefix and base64
 * decoding) and packs the result into the `svix-signature` header
 * as `v1,<base64>`.
 */
function verifySvixSignature(
  payload: string,
  headers: Headers,
  secret: string
): boolean {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const cleaned = secret.replace(/^whsec_/, "").trim();
  if (!cleaned) return false;

  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(cleaned, "base64");
  } catch {
    return false;
  }

  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  const provided = svixSignature
    .split(/\s+/)
    .map((entry) => entry.split(",")[1])
    .filter((sig): sig is string => Boolean(sig));

  for (const sig of provided) {
    const sigBuf = Buffer.from(sig);
    if (
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return true;
    }
  }
  return false;
}

function pickPrimaryEmail(user: ClerkUserPayload): string | null {
  const addresses = user.email_addresses ?? [];
  if (addresses.length === 0) return null;
  const primary = user.primary_email_address_id
    ? addresses.find((e) => e.id === user.primary_email_address_id)
    : null;
  const chosen = primary ?? addresses[0];
  return chosen?.email_address?.trim() ?? null;
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET?.trim();
  if (!secret) {
    await logAdminEvent("warn", "clerk-webhook-no-secret", {});
    return NextResponse.json({ received: true, configured: false });
  }

  const bodyRes = await readTextWithLimit(req, MAX_WEBHOOK_BYTES);
  if (!bodyRes.ok) return bodyRes.response;
  const payload = bodyRes.data;

  if (!verifySvixSignature(payload, req.headers, secret)) {
    await logAdminEvent("warn", "clerk-webhook-bad-signature", {});
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: ClerkWebhookEvent;
  try {
    event = JSON.parse(payload) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (event.type !== "user.created") {
    return NextResponse.json({ received: true });
  }

  const user = event.data ?? {};
  const userId = user.id;
  const email = pickPrimaryEmail(user);

  if (!userId || !email) {
    return NextResponse.json({ received: true });
  }

  if (!isDisposableEmail(email)) {
    return NextResponse.json({ received: true, allowed: true });
  }

  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
    await logAdminEvent("warn", "disposable-email-blocked", {
      userId,
      email,
    });
    return NextResponse.json({
      received: true,
      blocked: true,
      message: DISPOSABLE_EMAIL_ERROR_MESSAGE,
    });
  } catch (err) {
    const details = err instanceof Error ? err.message : "unknown";
    await logAdminEvent("error", "clerk-webhook-delete-failed", {
      userId,
      email,
      details,
    });
    // Tell Clerk we received it so the webhook isn't endlessly retried.
    return NextResponse.json({ received: true, blocked: false });
  }
}
