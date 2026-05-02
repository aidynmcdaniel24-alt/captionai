import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sub } = await supabaseServer
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  const plan = sub?.plan === "pro" ? "pro" : "free";

  let totalCaptions = 0;
  const { count, error: countError } = await supabaseServer
    .from("caption_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (!countError && typeof count === "number") {
    totalCaptions = count;
  }

  return NextResponse.json({ plan, totalCaptions });
}
