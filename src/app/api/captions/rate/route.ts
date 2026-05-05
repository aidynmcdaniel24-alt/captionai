import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATINGS = new Set(["worst", "medium", "best"]);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const historyId = (body.historyId ?? "").toString().trim();
  const rawIndex = body.captionIndex;
  if (rawIndex === null || rawIndex === undefined || rawIndex === "") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const captionIndex = Number(rawIndex);
  const rating = (body.rating ?? "").toString().trim().toLowerCase();

  if (
    !historyId ||
    Number.isNaN(captionIndex) ||
    !Number.isInteger(captionIndex) ||
    captionIndex < 0 ||
    !RATINGS.has(rating)
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { data: row } = await supabaseServer
    .from("caption_history")
    .select("id")
    .eq("id", historyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { error } = await supabaseServer.from("caption_ratings").upsert(
    {
      user_id: userId,
      history_id: historyId,
      caption_index: captionIndex,
      rating,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,history_id,caption_index" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
