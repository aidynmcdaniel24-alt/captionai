import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { resolveIsClerkAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type AdminTestimonialRow = {
  id: string;
  user_id: string;
  name: string;
  title: string;
  message: string;
  rating: number;
  helpful_count: number;
  approved: boolean;
  rejection_reason: string | null;
  created_at: string;
};

export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await resolveIsClerkAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseServer
    .from("testimonials")
    .select(
      "id, user_id, name, title, message, rating, helpful_count, approved, rejection_reason, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as AdminTestimonialRow[];
  const approved = rows.filter((r) => r.approved);
  const rejected = rows.filter((r) => !r.approved && r.rejection_reason);
  const pending = rows.filter((r) => !r.approved && !r.rejection_reason);

  return NextResponse.json({ pending, rejected, approved });
}
