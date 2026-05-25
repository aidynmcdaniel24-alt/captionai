import { NextResponse } from "next/server";
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
import { sanitizeText } from "@/lib/security/sanitize";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authResult = await requireUser(req, "ab-test");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "ab-test", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;
  const action = sanitizeText(body.action, { maxLength: 16 });

  if (action === "create") {
    const variantA = sanitizeText(body.variantA, { maxLength: 2000, allowLineBreaks: true });
    const variantB = sanitizeText(body.variantB, { maxLength: 2000, allowLineBreaks: true });
    const label = sanitizeText(body.label, { maxLength: 120 }) || null;
    const platform = sanitizeText(body.platform, { maxLength: 80 }) || null;
    if (!variantA || !variantB) {
      return NextResponse.json({ error: "Both variants required." }, { status: 400 });
    }
    const { data, error } = await supabaseServer
      .from("ab_experiments")
      .insert({
        user_id: userId,
        label,
        variant_a: variantA,
        variant_b: variantB,
        platform,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { error: safeErrorMessage(error, "Could not create experiment.") },
        { status: 500 }
      );
    }
    return NextResponse.json({ id: data?.id });
  }

  if (action === "pick") {
    const id = sanitizeText(body.id, { maxLength: 64 });
    const pick = sanitizeText(body.pick, { maxLength: 4 }).toLowerCase();
    if (!id || (pick !== "a" && pick !== "b")) {
      return NextResponse.json({ error: "Invalid pick." }, { status: 400 });
    }

    const { data: rpcData, error: rpcError } = await supabaseServer.rpc("increment_ab_pick", {
      p_id: id,
      p_user_id: userId,
      p_pick: pick,
    });

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      const row = rpcData[0] as { picks_a: number | null; picks_b: number | null };
      return NextResponse.json({
        ok: true,
        picks_a: row.picks_a ?? 0,
        picks_b: row.picks_b ?? 0,
      });
    }
    if (!rpcError && Array.isArray(rpcData) && rpcData.length === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const { data: exp } = await supabaseServer
      .from("ab_experiments")
      .select("id, user_id, picks_a, picks_b")
      .eq("id", id)
      .maybeSingle();

    if (!exp || exp.user_id !== userId) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const picksA = exp.picks_a ?? 0;
    const picksB = exp.picks_b ?? 0;
    const payload =
      pick === "a" ? { picks_a: picksA + 1 } : { picks_b: picksB + 1 };
    const nextA = pick === "a" ? picksA + 1 : picksA;
    const nextB = pick === "b" ? picksB + 1 : picksB;

    const { error } = await supabaseServer.from("ab_experiments").update(payload).eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: safeErrorMessage(error, "Could not update pick.") },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, picks_a: nextA, picks_b: nextB });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function GET(req: Request) {
  const authResult = await requireUser(req, "ab-test:list");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "ab-test:list", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const { data, error } = await supabaseServer
    .from("ab_experiments")
    .select("id, label, variant_a, variant_b, picks_a, picks_b, platform, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not load experiments.") },
      { status: 500 }
    );
  }
  return NextResponse.json({ items: data ?? [] });
}
