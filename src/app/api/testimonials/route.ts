import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type PublicTestimonial = {
  id: string;
  name: string;
  title: string;
  message: string;
  rating: number;
  helpful_count: number;
  created_at: string;
};

const MESSAGE_MAX = 200;
const NAME_MAX = 80;
const TITLE_MAX = 80;

export async function GET() {
  const { data, error } = await supabaseServer
    .from("testimonials")
    .select("id, name, title, message, rating, helpful_count, created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: (data ?? []) as PublicTestimonial[] });
}

type SubmitBody = {
  name?: string;
  title?: string;
  message?: string;
  rating?: number;
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to submit a testimonial." },
      { status: 401 }
    );
  }

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = (body.name ?? "").toString().trim();
  const title = (body.title ?? "").toString().trim();
  const message = (body.message ?? "").toString().trim();
  const rating = Number(body.rating);

  if (!name || name.length > NAME_MAX) {
    return NextResponse.json(
      { error: "Please enter your name (under 80 characters)." },
      { status: 400 }
    );
  }

  if (!title || title.length > TITLE_MAX) {
    return NextResponse.json(
      { error: "Please add a short title or role (under 80 characters)." },
      { status: 400 }
    );
  }

  if (!message) {
    return NextResponse.json({ error: "Please write a short message." }, { status: 400 });
  }

  if (message.length > MESSAGE_MAX) {
    return NextResponse.json(
      { error: `Message must be ${MESSAGE_MAX} characters or fewer.` },
      { status: 400 }
    );
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Please pick a rating from 1 to 5 stars." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseServer
    .from("testimonials")
    .insert({
      user_id: userId,
      name,
      title,
      message,
      rating,
      approved: false,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
