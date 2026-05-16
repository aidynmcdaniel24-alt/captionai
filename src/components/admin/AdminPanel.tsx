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

type AffiliateClickEvent = {
  type: "click";
  affiliate_user_id: string;
  code: string;
  timestamp: string;
};

type AffiliateSignupEvent = {
  type: "signup";
  affiliate_user_id: string;
  lead_user_id: string;
  timestamp: string;
};

type AffiliateUpgradeEvent = {
  type: "upgrade";
  affiliate_user_id: string;
  lead_user_id: string;
  earnings: number;
  timestamp: string;
  is_test: boolean;
};

type AffiliateEvent = AffiliateClickEvent | AffiliateSignupEvent | AffiliateUpgradeEvent;

type AffiliateTotals = {
  clicks: number;
  signups: number;
  upgrades: number;
  earningsCents: number;
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
  const [tab, setTab] = useState<"overview" | "errors" | "logs" | "affiliate">("overview");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState("");
  const [affiliateEvents, setAffiliateEvents] = useState<AffiliateEvent[]>([]);
  const [affiliateTotals, setAffiliateTotals] = useState<AffiliateTotals | null>(null);
  const [affiliateWarnings, setAffiliateWarnings] = useState<string[]>([]);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [affiliateError, setAffiliateError] = useState("");

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

  const loadAffiliate = useCallback(async () => {
    setAffiliateLoading(true);
    setAffiliateError("");
    try {
      const res = await fetch("/api/admin/affiliate");
      const data = (await res.json()) as {
        items?: AffiliateEvent[];
        totals?: AffiliateTotals;
        warnings?: string[];
        error?: string;
      };
      if (!res.ok) {
        setAffiliateError(data.error || "Could not load affiliate activity.");
        setAffiliateEvents([]);
        setAffiliateTotals(null);
        return;
      }
      setAffiliateEvents(data.items ?? []);
      setAffiliateTotals(data.totals ?? null);
      setAffiliateWarnings(data.warnings ?? []);
    } catch {
      setAffiliateError("Could not load affiliate activity.");
      setAffiliateEvents([]);
      setAffiliateTotals(null);
    } finally {
      setAffiliateLoading(false);
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
            ["affiliate", "Affiliate"],
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
              if (id === "affiliate") {
                void loadAffiliate();
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

      {tab === "affiliate" ? (
        <AffiliateActivitySection
          loading={affiliateLoading}
          error={affiliateError}
          warnings={affiliateWarnings}
          totals={affiliateTotals}
          events={affiliateEvents}
        />
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

function AffiliateActivitySection({
  loading,
  error,
  warnings,
  totals,
  events,
}: {
  loading: boolean;
  error: string;
  warnings: string[];
  totals: AffiliateTotals | null;
  events: AffiliateEvent[];
}) {
  const earnings =
    totals != null ? `$${(totals.earningsCents / 100).toFixed(2)}` : "—";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h2 className="text-lg font-semibold text-white">Affiliate activity</h2>
      <p className="mt-1 text-sm text-zinc-500">
        50 most recent events (clicks, signups, Pro upgrades), newest first.
      </p>

      {totals != null ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total link clicks" value={totals.clicks} />
          <StatCard label="Total signups" value={totals.signups} />
          <StatCard label="Total Pro upgrades" value={totals.upgrades} />
          <StatCard label="Total affiliate earnings" value={earnings} />
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <ul className="mt-4 space-y-1 text-xs text-amber-200/90">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      {loading ? (
        <p className="mt-4 text-zinc-500">Loading…</p>
      ) : error ? (
        <p className="mt-4 text-amber-200/90">{error}</p>
      ) : (
        <ul className="mt-4 max-h-[520px] space-y-3 overflow-y-auto text-sm">
          {events.length === 0 ? (
            <li className="text-zinc-500">No affiliate events yet.</li>
          ) : (
            events.map((ev, i) => (
              <li
                key={`${ev.type}-${ev.timestamp}-${i}`}
                className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
              >
                <AffiliateEventRow event={ev} />
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function AffiliateEventRow({ event }: { event: AffiliateEvent }) {
  const when = new Date(event.timestamp).toLocaleString();

  if (event.type === "click") {
    return (
      <>
        <AffiliateEventHeader label="Link click" when={when} accent="text-sky-400" />
        <p className="mt-1 text-zinc-300">
          Affiliate: <span className="font-mono text-xs">{event.affiliate_user_id}</span>
        </p>
        <p className="text-zinc-400">
          Code: <span className="font-mono text-xs">{event.code}</span>
        </p>
      </>
    );
  }

  if (event.type === "signup") {
    return (
      <>
        <AffiliateEventHeader label="New signup" when={when} accent="text-emerald-400" />
        <p className="mt-1 text-zinc-300">
          Affiliate: <span className="font-mono text-xs">{event.affiliate_user_id}</span>
        </p>
        <p className="text-zinc-400">
          Lead: <span className="font-mono text-xs">{event.lead_user_id}</span>
        </p>
      </>
    );
  }

  return (
    <>
      <AffiliateEventHeader
        label={event.is_test ? "Pro upgrade (test — no payout)" : "Pro upgrade"}
        when={when}
        accent={event.is_test ? "text-amber-400" : "text-purple-400"}
      />
      <p className="mt-1 text-zinc-300">
        Affiliate: <span className="font-mono text-xs">{event.affiliate_user_id}</span>
      </p>
      <p className="text-zinc-400">
        Lead: <span className="font-mono text-xs">{event.lead_user_id}</span>
        {" · "}
        Earnings: ${(event.earnings / 100).toFixed(2)}
      </p>
    </>
  );
}

function AffiliateEventHeader({
  label,
  when,
  accent,
}: {
  label: string;
  when: string;
  accent: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
      <span className={accent}>{label}</span>
      <span>{when}</span>
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
