import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const historyId = (body.historyId ?? "").toString().trim();
  const captionIndex = Number(body.captionIndex);
  if (!historyId || !Number.isInteger(captionIndex) || captionIndex < 0) {
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

  const { error } = await supabaseServer.from("caption_favorites").insert({
    user_id: userId,
    history_id: historyId,
    caption_index: captionIndex,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const historyId = (body.historyId ?? "").toString().trim();
  const captionIndex = Number(body.captionIndex);
  if (!historyId || !Number.isInteger(captionIndex)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("caption_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("history_id", historyId)
    .eq("caption_index", captionIndex);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
