import { NextResponse } from "next/server";
import { isAnnualPlan } from "@/lib/plan";
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
import { getPlan } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERSONALITY_OPTIONS = [
  "Bold",
  "Playful",
  "Professional",
  "Luxury",
  "Edgy",
  "Minimal",
  "Friendly",
  "Authoritative",
] as const;

function parsePersonality(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => String(v).trim())
    .filter((v) => PERSONALITY_OPTIONS.includes(v as (typeof PERSONALITY_OPTIONS)[number]));
}

// Only treat the table as truly missing when Postgres/PostgREST says the
// relation does not exist. Matching on the error message text is unreliable
// because almost every error (RLS denials, missing columns, permission issues)
// mentions the table name "brand_voice".
function isMissingTableError(error: { code?: string; message?: string }): boolean {
  // 42P01 = undefined_table (Postgres); PGRST205 = table not found in schema cache.
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("schema cache");
}

function parseWordList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter(Boolean).slice(0, 30);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);
  }
  return [];
}

export async function GET(req: Request) {
  const authResult = await requireUser(req, "brand-voice:get");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "brand-voice:get", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const plan = await getPlan(userId);

  try {
    const { data, error } = await supabaseServer
      .from("brand_voice")
      .select("brand_name, personality, words_to_use, words_to_avoid, example_caption, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      // Missing table — return empty profile with a helpful hint for admins.
      if (isMissingTableError(error)) {
        return NextResponse.json({
          plan,
          annualRequired: !isAnnualPlan(plan),
          profile: null,
          tableMissing: true,
        });
      }
      return NextResponse.json(
        { error: safeErrorMessage(error, "Could not load brand voice.") },
        { status: 500 }
      );
    }

    return NextResponse.json({
      plan,
      annualRequired: !isAnnualPlan(plan),
      profile: data
        ? {
            brandName: data.brand_name ?? "",
            personality: parsePersonality(data.personality),
            wordsToUse: parseWordList(data.words_to_use),
            wordsToAvoid: parseWordList(data.words_to_avoid),
            exampleCaption: data.example_caption ?? "",
            updatedAt: data.updated_at,
          }
        : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not load brand voice.") },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authResult = await requireUser(req, "brand-voice:save");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "brand-voice:save", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const plan = await getPlan(userId);
  if (!isAnnualPlan(plan)) {
    return NextResponse.json(
      { error: "Brand Tone Profiles are an Annual feature.", annualRequired: true },
      { status: 402 }
    );
  }

  const bodyResult = await readJsonWithLimit<Record<string, unknown>>(
    req,
    REQUEST_SIZE_LIMITS.captionGenerate
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const brandName = sanitizeText(body.brandName ?? body.brand_name, { maxLength: 120 });
  const personality = parsePersonality(body.personality);
  const wordsToUse = parseWordList(body.wordsToUse ?? body.words_to_use);
  const wordsToAvoid = parseWordList(body.wordsToAvoid ?? body.words_to_avoid);
  const exampleCaption = sanitizeText(body.exampleCaption ?? body.example_caption, {
    maxLength: 2000,
    allowLineBreaks: true,
  });

  if (!brandName && personality.length === 0 && !exampleCaption) {
    return NextResponse.json(
      { error: "Add at least a brand name, personality, or example caption." },
      { status: 400 }
    );
  }

  const row = {
    user_id: userId,
    brand_name: brandName || null,
    personality,
    words_to_use: wordsToUse,
    words_to_avoid: wordsToAvoid,
    example_caption: exampleCaption || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabaseServer
      .from("brand_voice")
      .upsert(row, { onConflict: "user_id" });

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            error:
              "Brand voice table is not set up yet. Run the brand_voice SQL migration in Supabase first.",
            tableMissing: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: safeErrorMessage(error, "Could not save brand voice.") },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, profile: row });
  } catch (e) {
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not save brand voice.") },
      { status: 500 }
    );
  }
}
