import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
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

  const recent = listResponse.data ?? [];

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <Link href="/dashboard" className="text-sm text-purple-400 hover:text-purple-300">
            ← Dashboard
          </Link>
        </div>

        <p className="mb-6 text-sm text-zinc-500">
          Signed in as admin. Counts use Clerk (users) and Supabase (subscriptions, caption_history).
        </p>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total users (Clerk)" value={totalUsers} />
          <StatCard
            label="Pro subscriptions"
            value={proError ? "—" : (proCount ?? 0)}
            hint={proError?.message}
          />
          <StatCard
            label="Captions generated today"
            value={todayErr ? "—" : (captionsToday ?? 0)}
            hint={todayErr?.message}
          />
          <StatCard
            label="Captions all time"
            value={allErr ? "—" : (captionsAllTime ?? 0)}
            hint={allErr?.message}
          />
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Recent signups</h2>
          <p className="mt-1 text-sm text-zinc-500">Latest 10 users from Clerk (newest first).</p>
          <ul className="mt-4 divide-y divide-zinc-800">
            {recent.length === 0 ? (
              <li className="py-3 text-zinc-500">No users returned.</li>
            ) : (
              recent.map((u) => {
                const email =
                  u.primaryEmailAddress?.emailAddress ??
                  u.emailAddresses?.[0]?.emailAddress ??
                  "—";
                const created =
                  typeof u.createdAt === "number"
                    ? new Date(u.createdAt).toLocaleString()
                    : "—";
                return (
                  <li key={u.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                    <span className="font-mono text-xs text-zinc-400">{u.id}</span>
                    <span className="text-zinc-200">{email}</span>
                    <span className="text-xs text-zinc-500">{created}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-amber-200/80">{hint}</p> : null}
    </div>
  );
}
