import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = { action?: "increment" | "decrement" };

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid testimonial id." }, { status: 400 });
  }

  // Default to increment for back-compat with any older clients.
  let action: "increment" | "decrement" = "increment";
  try {
    const body = (await req.json()) as Body | null;
    if (body?.action === "decrement") action = "decrement";
  } catch {
    // empty / non-JSON body is fine; we already default to increment
  }

  // Prefer the atomic RPC if it exists; fall back to read-modify-write.
  const rpcName =
    action === "increment"
      ? "testimonials_increment_helpful"
      : "testimonials_decrement_helpful";

  const rpc = await supabaseServer.rpc(rpcName, { testimonial_id: id });

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

  const current = existing.helpful_count ?? 0;
  const nextCount =
    action === "increment" ? current + 1 : Math.max(0, current - 1);

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
