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

type PayoutRequestRow = {
  id: string;
  affiliate_user_id: string;
  amount_cents: number;
  payment_method: string;
  payment_handle: string;
  preferred_currency: string;
  status: string;
  created_at: string;
};

type AdminTestimonial = {
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

type SecurityTotals = {
  disposable_email_blocked: number;
  rate_limit_hit: number;
  auth_failure: number;
  request_too_large: number;
};

type ModerationRow = {
  id: string;
  created_at: string;
  topic: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  user_id: string | null;
  feature: string;
};

type ModerationStats = {
  blockedToday: number;
  blockedAllTime: number;
  topTopics: Array<{ topic: string; count: number }>;
  topReasons: Array<{ reason: string; count: number }>;
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
  const [tab, setTab] = useState<
    | "overview"
    | "errors"
    | "logs"
    | "affiliate"
    | "payouts"
    | "testimonials"
    | "security"
    | "moderation"
  >("overview");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState("");
  const [securityLogs, setSecurityLogs] = useState<LogRow[]>([]);
  const [securityTotals, setSecurityTotals] = useState<SecurityTotals | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const [affiliateEvents, setAffiliateEvents] = useState<AffiliateEvent[]>([]);
  const [affiliateTotals, setAffiliateTotals] = useState<AffiliateTotals | null>(null);
  const [affiliateWarnings, setAffiliateWarnings] = useState<string[]>([]);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [affiliateError, setAffiliateError] = useState("");
  const [payoutItems, setPayoutItems] = useState<PayoutRequestRow[]>([]);
  const [payoutPendingCents, setPayoutPendingCents] = useState(0);
  const [payoutPaidCents, setPayoutPaidCents] = useState(0);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState("");
  const [payoutWarnings, setPayoutWarnings] = useState<string[]>([]);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [moderationItems, setModerationItems] = useState<ModerationRow[]>([]);
  const [moderationStats, setModerationStats] = useState<ModerationStats | null>(null);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [moderationError, setModerationError] = useState("");
  const [moderationWarnings, setModerationWarnings] = useState<string[]>([]);
  const [moderationClearing, setModerationClearing] = useState(false);
  const [pendingTestimonials, setPendingTestimonials] = useState<AdminTestimonial[]>([]);
  const [rejectedTestimonials, setRejectedTestimonials] = useState<AdminTestimonial[]>([]);
  const [approvedTestimonials, setApprovedTestimonials] = useState<AdminTestimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(false);
  const [testimonialsError, setTestimonialsError] = useState("");
  const [testimonialActionId, setTestimonialActionId] = useState<string | null>(null);

  const loadModeration = useCallback(async () => {
    setModerationLoading(true);
    setModerationError("");
    try {
      const res = await fetch("/api/admin/moderation");
      const data = (await res.json()) as {
        items?: ModerationRow[];
        stats?: ModerationStats;
        warnings?: string[];
        error?: string;
      };
      if (!res.ok) {
        setModerationError(data.error || "Could not load moderation events.");
        setModerationItems([]);
        setModerationStats(null);
        setModerationWarnings([]);
        return;
      }
      setModerationItems(data.items ?? []);
      setModerationStats(data.stats ?? null);
      setModerationWarnings(data.warnings ?? []);
    } catch {
      setModerationError("Could not load moderation events.");
      setModerationItems([]);
      setModerationStats(null);
      setModerationWarnings([]);
    } finally {
      setModerationLoading(false);
    }
  }, []);

  const clearModeration = useCallback(async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Clear all moderation logs? This permanently deletes every recorded blocked-content attempt."
      )
    ) {
      return;
    }
    setModerationClearing(true);
    setModerationError("");
    try {
      const res = await fetch("/api/admin/moderation", { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setModerationError(data.error || "Could not clear moderation logs.");
        return;
      }
      setModerationItems([]);
      setModerationStats({
        blockedToday: 0,
        blockedAllTime: 0,
        topTopics: [],
        topReasons: [],
      });
    } catch {
      setModerationError("Could not clear moderation logs.");
    } finally {
      setModerationClearing(false);
    }
  }, []);

  const loadSecurity = useCallback(async () => {
    setSecurityLoading(true);
    setSecurityError("");
    try {
      const res = await fetch("/api/admin/security");
      const data = (await res.json()) as {
        items?: LogRow[];
        totals?: SecurityTotals;
        warnings?: string[];
        error?: string;
      };
      if (!res.ok) {
        setSecurityError(data.error || "Could not load security events.");
        setSecurityLogs([]);
        setSecurityTotals(null);
        setSecurityWarnings([]);
        return;
      }
      setSecurityLogs(data.items ?? []);
      setSecurityTotals(data.totals ?? null);
      setSecurityWarnings(data.warnings ?? []);
    } catch {
      setSecurityError("Could not load security events.");
      setSecurityLogs([]);
      setSecurityTotals(null);
      setSecurityWarnings([]);
    } finally {
      setSecurityLoading(false);
    }
  }, []);

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

  const loadPayouts = useCallback(async () => {
    setPayoutLoading(true);
    setPayoutError("");
    try {
      const res = await fetch("/api/admin/payouts");
      const data = (await res.json()) as {
        items?: PayoutRequestRow[];
        totalPendingCents?: number;
        totalPaidCents?: number;
        warnings?: string[];
        error?: string;
      };
      if (!res.ok) {
        setPayoutError(data.error || "Could not load payout requests.");
        setPayoutItems([]);
        return;
      }
      setPayoutItems(data.items ?? []);
      setPayoutPendingCents(data.totalPendingCents ?? 0);
      setPayoutPaidCents(data.totalPaidCents ?? 0);
      setPayoutWarnings(data.warnings ?? []);
    } catch {
      setPayoutError("Could not load payout requests.");
      setPayoutItems([]);
    } finally {
      setPayoutLoading(false);
    }
  }, []);

  const loadTestimonials = useCallback(async () => {
    setTestimonialsLoading(true);
    setTestimonialsError("");
    try {
      const res = await fetch("/api/admin/testimonials");
      const data = (await res.json()) as {
        pending?: AdminTestimonial[];
        rejected?: AdminTestimonial[];
        approved?: AdminTestimonial[];
        error?: string;
      };
      if (!res.ok) {
        setTestimonialsError(data.error || "Could not load testimonials.");
        setPendingTestimonials([]);
        setRejectedTestimonials([]);
        setApprovedTestimonials([]);
        return;
      }
      setPendingTestimonials(data.pending ?? []);
      setRejectedTestimonials(data.rejected ?? []);
      setApprovedTestimonials(data.approved ?? []);
    } catch {
      setTestimonialsError("Could not load testimonials.");
      setPendingTestimonials([]);
      setRejectedTestimonials([]);
      setApprovedTestimonials([]);
    } finally {
      setTestimonialsLoading(false);
    }
  }, []);

  async function actOnTestimonial(id: string, action: "approve" | "reject") {
    setTestimonialActionId(id);
    setTestimonialsError("");
    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setTestimonialsError(data.error || "Could not update testimonial.");
        return;
      }
      await loadTestimonials();
    } catch {
      setTestimonialsError("Could not update testimonial.");
    } finally {
      setTestimonialActionId(null);
    }
  }

  async function deleteTestimonial(id: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Are you sure you want to delete this testimonial?")
    ) {
      return;
    }

    setTestimonialActionId(id);
    setTestimonialsError("");
    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setTestimonialsError(data.error || "Could not delete testimonial.");
        return;
      }
      setPendingTestimonials((prev) => prev.filter((t) => t.id !== id));
      setRejectedTestimonials((prev) => prev.filter((t) => t.id !== id));
      setApprovedTestimonials((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setTestimonialsError("Could not delete testimonial.");
    } finally {
      setTestimonialActionId(null);
    }
  }

  async function markPayoutPaid(id: string) {
    setMarkingPaidId(id);
    try {
      const res = await fetch("/api/admin/payouts/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPayoutError(data.error || "Could not mark as paid.");
        return;
      }
      await loadPayouts();
    } catch {
      setPayoutError("Could not mark as paid.");
    } finally {
      setMarkingPaidId(null);
    }
  }

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
            ["payouts", "Payouts"],
            ["testimonials", "Testimonials"],
            ["security", "Security"],
            ["moderation", "Moderation"],
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
              if (id === "payouts") {
                void loadPayouts();
              }
              if (id === "testimonials") {
                void loadTestimonials();
              }
              if (id === "security") {
                void loadSecurity();
              }
              if (id === "moderation") {
                void loadModeration();
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

      {tab === "payouts" ? (
        <PayoutsSection
          loading={payoutLoading}
          error={payoutError}
          warnings={payoutWarnings}
          totalPendingCents={payoutPendingCents}
          totalPaidCents={payoutPaidCents}
          items={payoutItems}
          markingPaidId={markingPaidId}
          onMarkPaid={markPayoutPaid}
        />
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

      {tab === "testimonials" ? (
        <TestimonialsSection
          loading={testimonialsLoading}
          error={testimonialsError}
          pending={pendingTestimonials}
          rejected={rejectedTestimonials}
          approved={approvedTestimonials}
          actionId={testimonialActionId}
          onApprove={(id) => actOnTestimonial(id, "approve")}
          onDelete={(id) => deleteTestimonial(id)}
        />
      ) : null}

      {tab === "security" ? (
        <SecuritySection
          loading={securityLoading}
          error={securityError}
          warnings={securityWarnings}
          totals={securityTotals}
          logs={securityLogs}
        />
      ) : null}

      {tab === "moderation" ? (
        <ModerationSection
          loading={moderationLoading}
          error={moderationError}
          warnings={moderationWarnings}
          stats={moderationStats}
          items={moderationItems}
          clearing={moderationClearing}
          onClear={clearModeration}
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

function PayoutsSection({
  loading,
  error,
  warnings,
  totalPendingCents,
  totalPaidCents,
  items,
  markingPaidId,
  onMarkPaid,
}: {
  loading: boolean;
  error: string;
  warnings: string[];
  totalPendingCents: number;
  totalPaidCents: number;
  items: PayoutRequestRow[];
  markingPaidId: string | null;
  onMarkPaid: (id: string) => void;
}) {
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h2 className="text-lg font-semibold text-white">Affiliate payout requests</h2>
      <p className="mt-1 text-sm text-zinc-500">
        50 most recent requests from <code className="text-zinc-400">affiliate_payout_requests</code>, newest
        first.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <StatCard label="Total pending payouts" value={fmt(totalPendingCents)} />
        <StatCard label="Total paid out (all time)" value={fmt(totalPaidCents)} />
      </div>

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
          {items.length === 0 ? (
            <li className="text-zinc-500">No payout requests yet.</li>
          ) : (
            items.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-zinc-300">
                      Affiliate:{" "}
                      <span className="font-mono text-xs">{row.affiliate_user_id}</span>
                    </p>
                    <p className="text-zinc-400">
                      Amount: <span className="text-zinc-200">{fmt(row.amount_cents)}</span>
                      {" · "}
                      Method:{" "}
                      <span className="capitalize">
                        {row.payment_method === "paypal"
                          ? "PayPal"
                          : row.payment_method === "venmo"
                            ? "Venmo"
                            : row.payment_method}
                      </span>
                    </p>
                    <p className="text-zinc-400">
                      Handle: <span className="font-mono text-xs">{row.payment_handle}</span>
                      {" · "}
                      Currency: {row.preferred_currency}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Status:{" "}
                      <span
                        className={
                          row.status === "paid" ? "text-emerald-400" : "text-amber-300"
                        }
                      >
                        {row.status}
                      </span>
                      {" · "}
                      Requested: {new Date(row.created_at).toLocaleString()}
                    </p>
                  </div>
                  {row.status === "pending" ? (
                    <button
                      type="button"
                      disabled={markingPaidId === row.id}
                      onClick={() => onMarkPaid(row.id)}
                      className="shrink-0 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {markingPaidId === row.id ? "Saving…" : "Mark as Paid"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
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

function TestimonialsSection({
  loading,
  error,
  pending,
  rejected,
  approved,
  actionId,
  onApprove,
  onDelete,
}: {
  loading: boolean;
  error: string;
  pending: AdminTestimonial[];
  rejected: AdminTestimonial[];
  approved: AdminTestimonial[];
  actionId: string | null;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">
            Pending testimonials
          </h2>
          <span className="text-xs text-zinc-500">
            {pending.length} awaiting review
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Submissions where the AI moderator was unavailable. Approve to publish, or
          delete to remove the submission.
        </p>

        {error ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-4 text-zinc-500">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="mt-4 text-zinc-500">No pending testimonials.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"
              >
                <TestimonialAdminRow row={t} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onApprove(t.id)}
                    disabled={actionId === t.id}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {actionId === t.id ? "Saving…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(t.id)}
                    disabled={actionId === t.id}
                    className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                  >
                    {actionId === t.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">
            Auto-rejected by AI
          </h2>
          <span className="text-xs text-zinc-500">
            {rejected.length} rejected
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          The AI moderator blocked these. Approve to override and publish, or delete
          to remove the submission.
        </p>

        {loading ? (
          <p className="mt-4 text-zinc-500">Loading…</p>
        ) : rejected.length === 0 ? (
          <p className="mt-4 text-zinc-500">
            No AI-rejected testimonials.
          </p>
        ) : (
          <ul className="mt-4 max-h-[520px] space-y-3 overflow-y-auto">
            {rejected.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-4"
              >
                <TestimonialAdminRow row={t} />
                {t.rejection_reason ? (
                  <p className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    <span className="font-semibold">AI reason:</span>{" "}
                    {t.rejection_reason}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onApprove(t.id)}
                    disabled={actionId === t.id}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {actionId === t.id ? "Saving…" : "Approve (override)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(t.id)}
                    disabled={actionId === t.id}
                    className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                  >
                    {actionId === t.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">
            Approved testimonials
          </h2>
          <span className="text-xs text-zinc-500">{approved.length} live</span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Already visible on the landing page. Delete to permanently remove from
          Supabase.
        </p>

        {loading ? (
          <p className="mt-4 text-zinc-500">Loading…</p>
        ) : approved.length === 0 ? (
          <p className="mt-4 text-zinc-500">
            No approved testimonials yet. Approve a pending submission to publish it.
          </p>
        ) : (
          <ul className="mt-4 max-h-[520px] space-y-3 overflow-y-auto">
            {approved.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"
              >
                <TestimonialAdminRow row={t} showHelpful />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onDelete(t.id)}
                    disabled={actionId === t.id}
                    className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                  >
                    {actionId === t.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TestimonialAdminRow({
  row,
  showHelpful = false,
}: {
  row: AdminTestimonial;
  showHelpful?: boolean;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span className="text-amber-300">{"★".repeat(row.rating)}{"☆".repeat(5 - row.rating)}</span>
        <span>{new Date(row.created_at).toLocaleString()}</span>
      </div>
      <p className="mt-2 text-sm text-zinc-200">&ldquo;{row.message}&rdquo;</p>
      <p className="mt-2 text-xs text-zinc-400">
        <span className="font-semibold text-zinc-200">{row.name}</span>
        {" · "}
        {row.title}
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">
        user: <span className="font-mono">{row.user_id}</span>
        {showHelpful ? (
          <>
            {" · "}helpful: <span className="text-zinc-300">{row.helpful_count}</span>
          </>
        ) : null}
      </p>
    </>
  );
}

function SecuritySection({
  loading,
  error,
  warnings,
  totals,
  logs,
}: {
  loading: boolean;
  error: string;
  warnings: string[];
  totals: SecurityTotals | null;
  logs: LogRow[];
}) {
  const SECURITY_LABELS: Record<string, { label: string; accent: string }> = {
    disposable_email_blocked: {
      label: "Disposable email blocked",
      accent: "text-amber-300",
    },
    rate_limit_hit: { label: "Rate limit hit", accent: "text-sky-400" },
    auth_failure: { label: "Auth failure", accent: "text-rose-400" },
    request_too_large: {
      label: "Request too large",
      accent: "text-fuchsia-300",
    },
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h2 className="text-lg font-semibold text-white">Security events</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Disposable email blocks, rate-limit hits, auth failures, and oversized
        requests. Showing the 100 most recent events, newest first.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total blocked emails"
          value={totals ? totals.disposable_email_blocked : "—"}
        />
        <StatCard
          label="Total rate-limit hits"
          value={totals ? totals.rate_limit_hit : "—"}
        />
        <StatCard
          label="Total auth failures"
          value={totals ? totals.auth_failure : "—"}
        />
      </div>

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
          {logs.length === 0 ? (
            <li className="text-zinc-500">No security events recorded.</li>
          ) : (
            logs.map((row) => {
              const info = SECURITY_LABELS[row.message] ?? {
                label: row.message,
                accent: "text-zinc-300",
              };
              return (
                <li
                  key={row.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                    <span className={info.accent}>{info.label}</span>
                    <span>{new Date(row.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-zinc-400">
                    {row.message}
                  </p>
                  {row.meta != null ? (
                    <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/30 p-2 text-xs text-zinc-400">
                      {JSON.stringify(row.meta, null, 2)}
                    </pre>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

function ModerationSection({
  loading,
  error,
  warnings,
  stats,
  items,
  clearing,
  onClear,
}: {
  loading: boolean;
  error: string;
  warnings: string[];
  stats: ModerationStats | null;
  items: ModerationRow[];
  clearing: boolean;
  onClear: () => void;
}) {
  const confidenceAccent: Record<ModerationRow["confidence"], string> = {
    high: "text-rose-300",
    medium: "text-amber-300",
    low: "text-sky-300",
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Content moderation</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Topics blocked by the AI content moderator. Showing the 50 most recent
            attempts, newest first.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={clearing || items.length === 0}
          className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-40"
        >
          {clearing ? "Clearing…" : "Clear all moderation logs"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Blocked attempts today"
          value={stats ? stats.blockedToday : "—"}
        />
        <StatCard
          label="Blocked attempts all time"
          value={stats ? stats.blockedAllTime : "—"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <h3 className="text-sm font-semibold text-zinc-200">
            Top 5 blocked topics
          </h3>
          {!stats || stats.topTopics.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">No blocked topics yet.</p>
          ) : (
            <ol className="mt-3 space-y-1 text-sm">
              {stats.topTopics.map((row, i) => (
                <li
                  key={`${row.topic}-${i}`}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="truncate text-zinc-300">
                    {i + 1}. {row.topic}
                  </span>
                  <span className="tabular-nums text-zinc-500">{row.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <h3 className="text-sm font-semibold text-zinc-200">
            Top 5 block reasons
          </h3>
          {!stats || stats.topReasons.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">No block reasons yet.</p>
          ) : (
            <ol className="mt-3 space-y-1 text-sm">
              {stats.topReasons.map((row, i) => (
                <li
                  key={`${row.reason}-${i}`}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="truncate text-zinc-300">
                    {i + 1}. {row.reason}
                  </span>
                  <span className="tabular-nums text-zinc-500">{row.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

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
          {items.length === 0 ? (
            <li className="text-zinc-500">No moderation events recorded.</li>
          ) : (
            items.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                  <span className={confidenceAccent[row.confidence]}>
                    {row.confidence} confidence
                  </span>
                  <span>{new Date(row.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-zinc-200">
                  <span className="text-zinc-500">Topic:</span>{" "}
                  <span className="font-mono text-xs">
                    {row.topic ? row.topic.slice(0, 50) : "(empty)"}
                    {row.topic.length > 50 ? "…" : ""}
                  </span>
                </p>
                <p className="text-zinc-400">
                  <span className="text-zinc-500">Reason:</span> {row.reason}
                </p>
                <p className="text-xs text-zinc-500">
                  Feature:{" "}
                  <span className="font-mono text-zinc-400">{row.feature}</span>
                  {" · "}
                  User:{" "}
                  <span className="font-mono">
                    {row.user_id ?? "(anonymous)"}
                  </span>
                </p>
              </li>
            ))
          )}
        </ul>
      )}
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
