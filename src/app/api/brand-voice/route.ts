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

// 42P01 = undefined_table in Postgres — the only case where we tell users to run the migration.
function isMissingTableError(error: { code?: string }): boolean {
  return error.code === "42P01";
}

function emptyBrandVoiceProfile() {
  return {
    brandName: "",
    personality: [] as string[],
    wordsToUse: [] as string[],
    wordsToAvoid: [] as string[],
    exampleCaption: "",
    updatedAt: null as string | null,
  };
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

function wordsToText(words: string[]): string | null {
  const text = words.join(", ").trim();
  return text || null;
}

function rowToProfile(data: {
  brand_name: string | null;
  personality: unknown;
  words_to_use: unknown;
  words_to_avoid: unknown;
  example_caption: string | null;
  updated_at?: string | null;
}) {
  return {
    brandName: data.brand_name ?? "",
    personality: parsePersonality(data.personality),
    wordsToUse: parseWordList(data.words_to_use),
    wordsToAvoid: parseWordList(data.words_to_avoid),
    exampleCaption: data.example_caption ?? "",
    updatedAt: data.updated_at ?? null,
  };
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
      const errorCode = (error as { code?: string }).code ?? "unknown";
      const errorMessage = error.message ?? "unknown";
      console.log("[brand-voice:get] Supabase error code:", errorCode);
      console.log("[brand-voice:get] Supabase error message:", errorMessage);

      if (isMissingTableError(error)) {
        return NextResponse.json({
          plan,
          annualRequired: !isAnnualPlan(plan),
          profile: emptyBrandVoiceProfile(),
          tableMissing: true,
        });
      }

      return NextResponse.json({
        plan,
        annualRequired: !isAnnualPlan(plan),
        profile: emptyBrandVoiceProfile(),
      });
    }

    return NextResponse.json({
      plan,
      annualRequired: !isAnnualPlan(plan),
      profile: data ? rowToProfile(data) : emptyBrandVoiceProfile(),
    });
  } catch (e) {
    console.log(
      "[brand-voice:get] unexpected exception:",
      e instanceof Error ? e.message : String(e)
    );
    return NextResponse.json({
      plan,
      annualRequired: !isAnnualPlan(plan),
      profile: emptyBrandVoiceProfile(),
    });
  }
}

async function saveBrandVoice(req: Request) {
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

  const now = new Date().toISOString();
  const row = {
    user_id: userId,
    brand_name: brandName || null,
    personality,
    words_to_use: wordsToText(wordsToUse),
    words_to_avoid: wordsToText(wordsToAvoid),
    example_caption: exampleCaption || null,
    updated_at: now,
  };

  try {
    const { data, error } = await supabaseServer
      .from("brand_voice")
      .upsert(row, { onConflict: "user_id" })
      .select("brand_name, personality, words_to_use, words_to_avoid, example_caption, updated_at")
      .single();

    if (error) {
      const errorCode = (error as { code?: string }).code ?? "unknown";
      const errorMessage = error.message ?? "unknown";
      console.log("[brand-voice:save] Supabase error code:", errorCode);
      console.log("[brand-voice:save] Supabase error message:", errorMessage);

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

    const profile = data ? rowToProfile(data) : rowToProfile({ ...row, updated_at: now });
    return NextResponse.json({ ok: true, success: true, profile });
  } catch (e) {
    console.log(
      "[brand-voice:save] unexpected exception:",
      e instanceof Error ? e.message : String(e)
    );
    return NextResponse.json(
      { error: safeErrorMessage(e, "Could not save brand voice.") },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return saveBrandVoice(req);
}

export async function PUT(req: Request) {
  return saveBrandVoice(req);
}
