import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Cache for 60s so we don't hammer Clerk from the homepage.
export const revalidate = 60;

export async function GET() {
  try {
    const client = await clerkClient();
    const count = await client.users.getCount();
    return NextResponse.json({ count: count ?? 0, ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    // Don't 500 — landing should keep working even if Clerk hiccups.
    return NextResponse.json({ count: 0, ok: false, error: msg });
  }
}
