import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid testimonial id." }, { status: 400 });
  }

  // Prefer the atomic RPC if it exists; fall back to read-modify-write.
  const rpc = await supabaseServer.rpc("testimonials_increment_helpful", {
    testimonial_id: id,
  });

  if (!rpc.error && typeof rpc.data === "number") {
    return NextResponse.json({ ok: true, helpful_count: rpc.data });
  }

  const { data: existing, error: readErr } = await supabaseServer
    .from("testimonials")
    .select("helpful_count, approved")
    .eq("id", id)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  if (!existing || !existing.approved) {
    return NextResponse.json(
      { error: "Testimonial not found." },
      { status: 404 }
    );
  }

  const nextCount = (existing.helpful_count ?? 0) + 1;
  const { data: updated, error: updateErr } = await supabaseServer
    .from("testimonials")
    .update({ helpful_count: nextCount })
    .eq("id", id)
    .select("helpful_count")
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, helpful_count: updated.helpful_count });
}
