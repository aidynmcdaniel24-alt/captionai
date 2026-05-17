import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { resolveIsClerkAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId || !(await resolveIsClerkAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing payout request id." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("affiliate_payout_requests")
    .update({ status: "paid" })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Payout request not found or already marked paid." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, id: data.id, status: data.status });
}
