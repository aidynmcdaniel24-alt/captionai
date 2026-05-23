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

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

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

function isPermissionOrRlsError(error: SupabaseLikeError | null) {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    error.code === "42501" ||
    text.includes("row-level security") ||
    text.includes("violates row-level security") ||
    text.includes("permission denied") ||
    text.includes("not authorized")
  );
}

function brandVoiceDbErrorResponse(action: "load" | "save", error: SupabaseLikeError) {
  const permissionIssue = isPermissionOrRlsError(error);
  const missingTable = error.code === "42P01";
  const missingColumn = error.code === "42703";
  const conflictIssue = error.code === "42P10";

  let hint =
    "Verify the brand_voice table exists with columns: user_id, brand_name, description, personality, words_to_use, words_to_avoid, example_caption, updated_at.";

  if (permissionIssue) {
    hint =
      "Supabase permissions/RLS blocked this request. Server routes should use SUPABASE_SERVICE_ROLE_KEY, or add RLS policies that allow this user's insert/update/select on public.brand_voice.";
  } else if (missingTable) {
    hint = "Supabase cannot find public.brand_voice. Run supabase/brand_voice.sql in the same Supabase project used by NEXT_PUBLIC_SUPABASE_URL.";
  } else if (missingColumn) {
    hint =
      "The public.brand_voice table is missing one of the selected/upserted columns. Confirm the column names exactly match the CaptionAI schema.";
  } else if (conflictIssue) {
    hint = "The upsert conflict target failed. Confirm user_id is the primary key or has a unique constraint on public.brand_voice.";
  }

  return NextResponse.json(
    {
      error:
        action === "save"
          ? "Could not save brand voice."
          : "Could not load brand voice.",
      details: error.message ?? "Unknown Supabase error.",
      code: error.code,
      hint,
      rlsOrPermissionIssue: permissionIssue,
    },
    { status: permissionIssue ? 403 : 500 }
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
      return brandVoiceDbErrorResponse("load", error);
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
  try {
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

    const { error } = await supabaseServer
      .from("brand_voice")
      .upsert(row, { onConflict: "user_id" });

    if (error) {
      return brandVoiceDbErrorResponse("save", error);
    }

    return NextResponse.json({ brandVoice: rowToBrandVoice(row) });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Could not save brand voice.",
        details,
        hint: "Unexpected server error before Supabase returned a response. Check server logs and environment variables.",
      },
      { status: 500 }
    );
  }
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
