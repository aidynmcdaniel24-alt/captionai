"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function SettingsQuickActions() {
  const [plan, setPlan] = useState<"free" | "pro" | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/subscription");
        const data = (await res.json()) as { plan?: string };
        if (!cancelled) {
          setPlan(data.plan === "pro" ? "pro" : "free");
        }
      } catch {
        if (!cancelled) {
          setPlan("free");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openBillingPortal() {
    setPortalError("");
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setPortalError(data.error || "Could not open billing portal.");
    } catch {
      setPortalError("Could not open billing portal. Try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="mb-6">
    <div className="flex flex-wrap items-center gap-3">
      {plan === "pro" ? (
        <button
          type="button"
          className="rounded-lg border border-zinc-600 bg-zinc-800/80 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800 disabled:opacity-60"
          disabled={portalLoading}
          onClick={openBillingPortal}
        >
          {portalLoading ? "Opening portal…" : "Manage subscription"}
        </button>
      ) : null}
      <Link
        href="/settings"
        className="rounded-lg border border-zinc-600 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
      >
        Account &amp; security
      </Link>
    </div>
    {portalError ? (
      <p className="mt-2 text-sm text-red-400" role="alert">
        {portalError}
      </p>
    ) : null}
    </div>
  );
}
