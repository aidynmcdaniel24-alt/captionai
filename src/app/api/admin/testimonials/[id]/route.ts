import { NextResponse } from "next/server";
import { resolveIsClerkAdmin } from "@/lib/admin";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
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

type PatchBody = { action?: "approve" | "reject" };

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const authResult = await requireUser(req, "admin:testimonials:patch");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  if (!(await resolveIsClerkAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimited = rateLimitByUser(userId, "admin:testimonials:patch", RATE_LIMITS.adminApi);
  if (rateLimited) return rateLimited;

  const { id } = await ctx.params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid testimonial id." }, { status: 400 });
  }

  const bodyResult = await readJsonWithLimit<PatchBody>(req, REQUEST_SIZE_LIMITS.default);
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'." },
      { status: 400 }
    );
  }

  if (body.action === "approve") {
    const { data, error } = await supabaseServer
      .from("testimonials")
      .update({ approved: true, rejection_reason: null })
      .eq("id", id)
      .select("id, approved")
      .maybeSingle();

    if (error)
      return NextResponse.json(
        { error: safeErrorMessage(error, "Could not approve testimonial.") },
        { status: 500 }
      );
    if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true, id: data.id, approved: data.approved });
  }

  // reject → delete
  const { data, error } = await supabaseServer
    .from("testimonials")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error)
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not reject testimonial.") },
      { status: 500 }
    );
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, id: data.id, deleted: true });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const authResult = await requireUser(req, "admin:testimonials:delete");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  if (!(await resolveIsClerkAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimited = rateLimitByUser(userId, "admin:testimonials:delete", RATE_LIMITS.adminApi);
  if (rateLimited) return rateLimited;

  const { id } = await ctx.params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid testimonial id." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("testimonials")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error)
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not delete testimonial.") },
      { status: 500 }
    );
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, id: data.id, deleted: true });
}
