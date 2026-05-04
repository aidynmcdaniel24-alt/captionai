import { auth, clerkClient } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { userId } = await auth();
  const adminId = process.env.CLERK_ADMIN_USER_ID?.trim();

  if (!userId || !adminId || userId !== adminId) {
    notFound();
  }

  const client = await clerkClient();

  const [totalUsers, listResponse] = await Promise.all([
    client.users.getCount(),
    client.users.getUserList({ limit: 10, orderBy: "-created_at" }),
  ]);

  const { count: proCount, error: proError } = await supabaseServer
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("plan", "pro");

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const { count: captionsToday, error: todayErr } = await supabaseServer
    .from("caption_history")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfToday.toISOString());

  const { count: captionsAllTime, error: allErr } = await supabaseServer
    .from("caption_history")
    .select("*", { count: "exact", head: true });

  const recentRaw = listResponse.data ?? [];
  const recent = recentRaw.map((u) => {
    const email =
      u.primaryEmailAddress?.emailAddress ??
      u.emailAddresses?.[0]?.emailAddress ??
      "—";
    const created =
      typeof u.createdAt === "number" ? new Date(u.createdAt).toLocaleString() : "—";
    return { id: u.id, email, created };
  });

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white">
      <AdminPanel
        totalUsers={totalUsers}
        proCount={proError ? "—" : (proCount ?? 0)}
        proError={proError?.message}
        captionsToday={todayErr ? "—" : (captionsToday ?? 0)}
        todayErr={todayErr?.message}
        captionsAllTime={allErr ? "—" : (captionsAllTime ?? 0)}
        allErr={allErr?.message}
        recent={recent}
      />
    </main>
  );
}
