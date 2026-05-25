import { NextResponse } from "next/server";
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
  const authResult = await requireUser(req, "subscription:get");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "subscription:get", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const { data, error } = await supabaseServer
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not load subscription.") },
      { status: 500 }
    );
  }

  const plan = data?.plan === "pro" ? "pro" : "free";
  return NextResponse.json({ plan });
}
