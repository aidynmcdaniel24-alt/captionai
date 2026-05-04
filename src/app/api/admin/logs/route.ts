import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isClerkAdminUser } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId || !isClerkAdminUser(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
