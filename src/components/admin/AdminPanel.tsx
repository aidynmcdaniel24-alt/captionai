"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

type LogRow = {
  id: string;
  level: string;
  message: string;
  meta: unknown;
  created_at: string;
};

type RecentUser = {
  id: string;
  email: string;
  created: string;
};

export function AdminPanel({
  totalUsers,
  proCount,
  proError,
  captionsToday,
  todayErr,
  captionsAllTime,
  allErr,
  recent,
}: {
  totalUsers: number;
  proCount: number | "—";
  proError?: string;
  captionsToday: number | "—";
  todayErr?: string;
  captionsAllTime: number | "—";
  allErr?: string;
  recent: RecentUser[];
}) {
  const [tab, setTab] = useState<"overview" | "errors" | "logs">("overview");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState("");

  const loadLogs = useCallback(async (level?: string) => {
    setLogLoading(true);
    setLogError("");
    try {
      const q = new URLSearchParams();
      if (level === "error") {
        q.set("level", "error");
      }
      q.set("limit", "100");
      const res = await fetch(`/api/admin/logs?${q.toString()}`);
      const data = (await res.json()) as { items?: LogRow[]; error?: string };
      if (!res.ok) {
        setLogError(data.error || "Could not load logs.");
        setLogs([]);
        return;
      }
      setLogs(data.items ?? []);
    } catch {
      setLogError("Could not load logs.");
      setLogs([]);
    } finally {
      setLogLoading(false);
    }
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <Link href="/dashboard" className="text-sm text-purple-400 hover:text-purple-300">
          ← Dashboard
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-800 pb-4">
        {(
          [
            ["overview", "Overview"],
            ["errors", "Error logs"],
            ["logs", "All logs"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              if (id === "errors") {
                void loadLogs("error");
              }
              if (id === "logs") {
                void loadLogs();
              }
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === id ? "bg-purple-600 text-white" : "text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <p className="mb-6 text-sm text-zinc-500">
            Counts use Clerk (users) and Supabase (subscriptions, caption_history).
          </p>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Total users (Clerk)" value={totalUsers} />
            <StatCard
              label="Pro subscriptions"
              value={proCount === null ? "—" : proCount}
              hint={proError}
            />
            <StatCard
              label="Captions generated today"
              value={captionsToday === null ? "—" : captionsToday}
              hint={todayErr}
            />
            <StatCard
              label="Captions all time"
              value={captionsAllTime === null ? "—" : captionsAllTime}
              hint={allErr}
            />
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="text-lg font-semibold text-white">Recent signups</h2>
            <p className="mt-1 text-sm text-zinc-500">Latest 10 users from Clerk (newest first).</p>
            <ul className="mt-4 divide-y divide-zinc-800">
              {recent.length === 0 ? (
                <li className="py-3 text-zinc-500">No users returned.</li>
              ) : (
                recent.map((u) => (
                  <li
                    key={u.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
                  >
                    <span className="font-mono text-xs text-zinc-400">{u.id}</span>
                    <span className="text-zinc-200">{u.email}</span>
                    <span className="text-xs text-zinc-500">{u.created}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      ) : null}

      {tab === "errors" || tab === "logs" ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">{tab === "errors" ? "Error logs" : "All logs"}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            From <code className="text-zinc-400">admin_logs</code>. Ensure features_restore SQL has been applied.
          </p>
          {logLoading ? (
            <p className="mt-4 text-zinc-500">Loading…</p>
          ) : logError ? (
            <p className="mt-4 text-amber-200/90">{logError}</p>
          ) : (
            <ul className="mt-4 max-h-[480px] space-y-3 overflow-y-auto text-sm">
              {logs.length === 0 ? (
                <li className="text-zinc-500">No log rows.</li>
              ) : (
                logs.map((row) => (
                  <li key={row.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                      <span
                        className={
                          row.level === "error"
                            ? "text-red-400"
                            : row.level === "warn"
                              ? "text-amber-300"
                              : "text-zinc-400"
                        }
                      >
                        {row.level}
                      </span>
                      <span>{new Date(row.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-zinc-200">{row.message}</p>
                    {row.meta != null ? (
                      <pre className="mt-2 max-h-24 overflow-auto rounded bg-black/30 p-2 text-xs text-zinc-400">
                        {JSON.stringify(row.meta, null, 2)}
                      </pre>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      ) : null}
    </div>
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
