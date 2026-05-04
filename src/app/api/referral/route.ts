import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/get-app-url";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function randomCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return s;
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabaseServer
    .from("referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();

  let code = existing?.code;
  if (!code) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const tryCode = randomCode();
      const { data: taken } = await supabaseServer
        .from("referral_codes")
        .select("code")
        .eq("code", tryCode)
        .maybeSingle();
      if (taken) {
        continue;
      }
      const { error } = await supabaseServer.from("referral_codes").insert({
        user_id: userId,
        code: tryCode,
      });
      if (!error) {
        code = tryCode;
        break;
      }
    }
  }

  if (!code) {
    return NextResponse.json({ error: "Could not allocate referral code." }, { status: 500 });
  }

  const base = getAppUrl(req);
  const link = `${base}/sign-up?ref=${encodeURIComponent(code)}`;

  const { count } = await supabaseServer
    .from("referral_claims")
    .select("*", { count: "exact", head: true })
    .eq("referrer_user_id", userId);

  return NextResponse.json({
    code,
    link,
    referralsCount: count ?? 0,
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const code = (body.code ?? "").toString().trim().toLowerCase();
  if (!code) {
    return NextResponse.json({ error: "Missing code." }, { status: 400 });
  }

  const { data: row } = await supabaseServer
    .from("referral_codes")
    .select("user_id")
    .eq("code", code)
    .maybeSingle();

  if (!row?.user_id || row.user_id === userId) {
    return NextResponse.json({ error: "Invalid referral code." }, { status: 400 });
  }

  const { data: already } = await supabaseServer
    .from("referral_claims")
    .select("id")
    .eq("referred_user_id", userId)
    .maybeSingle();

  if (already) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error } = await supabaseServer.from("referral_claims").insert({
    referrer_user_id: row.user_id,
    referred_user_id: userId,
    code,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
