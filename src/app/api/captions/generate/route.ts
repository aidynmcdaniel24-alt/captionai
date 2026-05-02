import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq-client";
import { supabaseServer } from "@/lib/supabase/server";

type Plan = "free" | "pro";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

function buildPrompt(topic: string, platform: string, tone: string) {
  return `
You are an expert social media copywriter.
Generate exactly 3 captions for this request.

Topic: "${topic}"
Platform: "${platform}"
Tone: "${tone}"

Rules:
- Make each caption platform-specific.
- Keep each caption unique and engaging.
- Match tone exactly.
- Add relevant hashtags at the end of each caption.
- Return valid JSON only, with this shape:
{"captions":["caption 1","caption 2","caption 3"]}
`;
}

function parseCaptionsFromModel(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { captions?: string[] };
    if (!parsed.captions || parsed.captions.length !== 3) {
      return null;
    }

    return parsed.captions.map((item) => item.trim()).filter(Boolean);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const debugGroqKey = process.env.GROQ_API_KEY ?? "";
  console.log("[debug] GROQ_API_KEY loaded:", debugGroqKey ? `${debugGroqKey.slice(0, 8)}...${debugGroqKey.slice(-6)}` : "EMPTY");

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const topic = (body.topic ?? "").toString().trim();
  const platform = (body.platform ?? "Instagram").toString();
  const tone = (body.tone ?? "inspirational").toString();

  if (!topic) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  const today = getTodayDateString();

  const { data: subscriptionRow, error: subscriptionError } = await supabaseServer
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (subscriptionError) {
    return NextResponse.json(
      {
        error:
          "Could not read subscription status. Check your Supabase key and make sure the subscriptions table exists.",
        stage: "subscription-read",
        details: subscriptionError.message,
      },
      { status: 500 }
    );
  }

  const plan: Plan = subscriptionRow?.plan === "pro" ? "pro" : "free";

  if (!subscriptionRow) {
    await supabaseServer.from("subscriptions").insert({
      user_id: userId,
      plan: "free",
      updated_at: new Date().toISOString(),
    });
  }

  const { data: usageRow, error: usageReadError } = await supabaseServer
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (usageReadError) {
    return NextResponse.json(
      {
        error:
          "Could not read daily usage. Check your Supabase key and make sure the usage table exists.",
        stage: "usage-read",
        details: usageReadError.message,
      },
      { status: 500 }
    );
  }

  const currentCount = usageRow?.count ?? 0;
  const freeLimit = 5;

  if (plan === "free" && currentCount >= freeLimit) {
    return NextResponse.json(
      {
        error: "Free plan limit reached.",
        paywall: true,
        plan,
        count: currentCount,
        limit: freeLimit,
      },
      { status: 402 }
    );
  }

  const nextCount = currentCount + 1;

  const { error: usageWriteError } = await supabaseServer.from("usage").upsert(
    {
      user_id: userId,
      date: today,
      count: nextCount,
    },
    {
      onConflict: "user_id,date",
    }
  );

  if (usageWriteError) {
    return NextResponse.json(
      {
        error: "Could not update daily usage.",
        stage: "usage-write",
        details: usageWriteError.message,
      },
      { status: 500 }
    );
  }
  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json(
      {
        error: "Missing GROQ_API_KEY in environment variables.",
        stage: "groq-key-read",
      },
      { status: 500 }
    );
  }

  let captions: string[] = [];

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.9,
      messages: [
        {
          role: "system",
          content:
            "You write high-quality social media captions and always return strict JSON when asked.",
        },
        {
          role: "user",
          content: buildPrompt(topic, platform, tone),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = parseCaptionsFromModel(content);

    if (!parsed) {
      return NextResponse.json(
        { error: "AI response format was invalid. Please try again." },
        { status: 502 }
      );
    }

    captions = parsed;
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unknown Groq API error.";

    return NextResponse.json(
      {
        error: "Could not generate AI captions with Groq. Check your GROQ_API_KEY.",
        stage: "groq-generate",
        details,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    captions,
    plan,
    usage: {
      count: nextCount,
      limit: plan === "free" ? freeLimit : null,
      date: today,
    },
  });
}
