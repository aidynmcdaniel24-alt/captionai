import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  BRAND_PERSONALITIES,
  type BrandPersonality,
  type BrandVoiceRow,
  normalizePersonality,
  rowToBrandVoice,
} from "@/lib/brand-voice";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELD_LIMITS = {
  brandName: 80,
  description: 400,
  wordsToUse: 400,
  wordsToAvoid: 400,
  exampleCaption: 1200,
} as const;

function trimToLimit(value: unknown, limit: number): string {
  return String(value ?? "").trim().slice(0, limit);
}

function emptyBrandVoiceResponse() {
  return NextResponse.json({
    brandVoice: null,
    allPersonalities: BRAND_PERSONALITIES,
  });
}

function isEmptyResultError(error: { code?: string; message?: string; details?: string } | null) {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    error.code === "PGRST116" ||
    text.includes("0 rows") ||
    text.includes("zero rows") ||
    text.includes("no rows") ||
    text.includes("contains 0 rows") ||
    text.includes("result contains 0 rows")
  );
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseServer
      .from("brand_voice")
      .select(
        "user_id, brand_name, description, personality, words_to_use, words_to_avoid, example_caption, updated_at"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (isEmptyResultError(error)) {
      return emptyBrandVoiceResponse();
    }

    if (error) {
      return NextResponse.json(
        {
          error: "Could not load brand voice.",
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!row) {
      return emptyBrandVoiceResponse();
    }

    return NextResponse.json({
      brandVoice: rowToBrandVoice(row as BrandVoiceRow),
      allPersonalities: BRAND_PERSONALITIES,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Could not load brand voice.",
        details,
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const personality: BrandPersonality[] = normalizePersonality(body.personality);
  const row: BrandVoiceRow = {
    user_id: userId,
    brand_name: trimToLimit(body.brandName, FIELD_LIMITS.brandName),
    description: trimToLimit(body.description, FIELD_LIMITS.description),
    personality,
    words_to_use: trimToLimit(body.wordsToUse, FIELD_LIMITS.wordsToUse),
    words_to_avoid: trimToLimit(body.wordsToAvoid, FIELD_LIMITS.wordsToAvoid),
    example_caption: trimToLimit(body.exampleCaption, FIELD_LIMITS.exampleCaption),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServer
    .from("brand_voice")
    .upsert(row, { onConflict: "user_id" })
    .select(
      "user_id, brand_name, description, personality, words_to_use, words_to_avoid, example_caption, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: "Could not save brand voice. Run supabase/brand_voice.sql in Supabase.",
        details: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ brandVoice: rowToBrandVoice(data as BrandVoiceRow) });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabaseServer
    .from("brand_voice")
    .delete()
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
