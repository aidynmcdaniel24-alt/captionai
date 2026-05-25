import { NextResponse } from "next/server";
import {
  RATE_LIMITS,
  rateLimitByIp,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import {
  readJsonWithLimit,
  REQUEST_SIZE_LIMITS,
} from "@/lib/security/request-size";
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
  const rateLimited = rateLimitByIp(req, "testimonials:helpful", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const { id } = await ctx.params;

  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid testimonial id." }, { status: 400 });
  }

  let action: "increment" | "decrement" = "increment";
  const bodyResult = await readJsonWithLimit<Body>(req, REQUEST_SIZE_LIMITS.default);
  if (bodyResult.ok) {
    if (bodyResult.data?.action === "decrement") action = "decrement";
  }

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
    return NextResponse.json(
      { error: safeErrorMessage(readErr, "Could not load testimonial.") },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: safeErrorMessage(updateErr, "Could not update helpful count.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, helpful_count: updated.helpful_count });
}
