import { NextResponse } from "next/server";
import {
  RATE_LIMITS,
  rateLimitByIp,
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
import { moderateTestimonial } from "@/lib/testimonial-moderation";

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

export type SubmitTestimonialResponse =
  | {
      ok: true;
      id: string;
      status: "approved";
      message: string;
    }
  | {
      ok: true;
      id: string;
      status: "rejected";
      rejection_reason: string;
      message: string;
    }
  | {
      ok: true;
      id: string;
      status: "pending";
      message: string;
    };

const MESSAGE_MAX = 200;
const NAME_MAX = 80;
const TITLE_MAX = 80;

export async function GET(req: Request) {
  const rateLimited = rateLimitByIp(req, "testimonials:list", RATE_LIMITS.publicRead);
  if (rateLimited) return rateLimited;

  const { data, error } = await supabaseServer
    .from("testimonials")
    .select("id, name, title, message, rating, helpful_count, created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not load testimonials.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ items: (data ?? []) as PublicTestimonial[] });
}

type SubmitBody = {
  name?: unknown;
  title?: unknown;
  message?: unknown;
  rating?: unknown;
};

export async function POST(req: Request) {
  const authResult = await requireUser(req, "testimonials:submit");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(
    userId,
    "testimonials:submit",
    RATE_LIMITS.generalApi
  );
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<SubmitBody>(
    req,
    REQUEST_SIZE_LIMITS.testimonial
  );
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const name = sanitizeText(body.name, { maxLength: NAME_MAX });
  const title = sanitizeText(body.title, { maxLength: TITLE_MAX });
  const message = sanitizeText(body.message, {
    maxLength: MESSAGE_MAX,
    allowLineBreaks: true,
  });
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

  const moderation = await moderateTestimonial({ name, title, message, rating });

  const approved = moderation.status === "approved";
  const rejectionReason =
    moderation.status === "rejected" ? moderation.reason : null;

  const { data, error } = await supabaseServer
    .from("testimonials")
    .insert({
      user_id: userId,
      name,
      title,
      message,
      rating,
      approved,
      rejection_reason: rejectionReason,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Could not save your testimonial.") },
      { status: 500 }
    );
  }

  if (moderation.status === "approved") {
    const payload: SubmitTestimonialResponse = {
      ok: true,
      id: data.id,
      status: "approved",
      message: "Your testimonial was approved and is now live on the landing page.",
    };
    return NextResponse.json(payload);
  }

  if (moderation.status === "rejected") {
    const payload: SubmitTestimonialResponse = {
      ok: true,
      id: data.id,
      status: "rejected",
      rejection_reason: moderation.reason,
      message: `Your testimonial was not approved: ${moderation.reason}`,
    };
    return NextResponse.json(payload);
  }

  const payload: SubmitTestimonialResponse = {
    ok: true,
    id: data.id,
    status: "pending",
    message:
      "Your testimonial was submitted and is awaiting review by our team.",
  };
  return NextResponse.json(payload);
}
