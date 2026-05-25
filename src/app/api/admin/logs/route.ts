import { NextResponse } from "next/server";
import { resolveIsClerkAdmin } from "@/lib/admin";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authResult = await requireUser(req, "admin:logs");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  if (!(await resolveIsClerkAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimited = rateLimitByUser(userId, "admin:logs", RATE_LIMITS.adminApi);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level")?.trim();
  const limit = Math.min(200, Math.max(10, Number(searchParams.get("limit")) || 50));

  let q = supabaseServer.from("admin_logs").select("id, level, message, meta, created_at").order("created_at", {
    ascending: false,
  }).limit(limit);

  if (level === "info" || level === "warn" || level === "error") {
    q = q.eq("level", level);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not load admin logs.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ items: data ?? [] });
}
