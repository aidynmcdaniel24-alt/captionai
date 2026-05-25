import { NextResponse } from "next/server";
import { RATE_LIMITS, rateLimitByIp } from "@/lib/security/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Cache the result for 60s so we don't hammer Supabase from the homepage.
export const revalidate = 60;

export async function GET(req: Request) {
  const rateLimited = rateLimitByIp(req, "stats:captions", RATE_LIMITS.publicRead);
  if (rateLimited) return rateLimited;

  try {
    const { count, error } = await supabaseServer
      .from("caption_history")
      .select("*", { count: "exact", head: true });

    if (error) {
      // Don't 500 — landing should keep working even if the table is missing.
      return NextResponse.json({ count: 0, ok: false, error: error.message });
    }

    return NextResponse.json({ count: count ?? 0, ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ count: 0, ok: false, error: msg });
  }
}
