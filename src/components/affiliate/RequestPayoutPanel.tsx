"use client";

import {
  convertUsdCentsToCurrency,
  formatCurrencyAmount,
  PAYOUT_CURRENCIES,
  type ExchangeRatesFromUsd,
  type PayoutCurrency,
} from "@/lib/affiliate-currency";
import { useMemo, useState } from "react";

type PayoutInfo = {
  minPayoutCents: number;
  availableCents: number;
  eligible: boolean;
  hasPendingPayout: boolean;
};

type Props = {
  payout: PayoutInfo;
  exchangeRates: ExchangeRatesFromUsd;
  onSuccess: () => void;
};

export function RequestPayoutPanel({ payout, exchangeRates, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"paypal" | "venmo">("paypal");
  const [handle, setHandle] = useState("");
  const [currency, setCurrency] = useState<PayoutCurrency>("USD");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const usdAmount = payout.availableCents / 100;
  const convertedAmount = useMemo(
    () => convertUsdCentsToCurrency(payout.availableCents, currency, exchangeRates),
    [payout.availableCents, currency, exchangeRates]
  );
  const convertedLabel = formatCurrencyAmount(convertedAmount, currency);

  if (!payout.eligible && !payout.hasPendingPayout && payout.availableCents < payout.minPayoutCents) {
    return (
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Payouts are available once you reach{" "}
        <strong className="text-zinc-800 dark:text-zinc-200">${(payout.minPayoutCents / 100).toFixed(2)}</strong> in
        earnings (${usdAmount.toFixed(2)} available now).
      </p>
    );
  }

  if (payout.hasPendingPayout) {
    return (
      <p className="mt-4 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-100">
        You have a pending payout request. We will process it within 3–5 business days.
      </p>
    );
  }

  if (confirmed) {
    return (
      <p
        className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
        role="status"
      >
        Payout request sent! We will process it within 3-5 business days.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/affiliate/request-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          paymentMethod: method,
          paymentHandle: handle.trim(),
          preferredCurrency: currency,
          note: note.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not submit payout request.");
        return;
      }
      setOpen(false);
      setConfirmed(true);
      onSuccess();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Available to cash out:{" "}
        <strong className="text-emerald-800 dark:text-emerald-200">${usdAmount.toFixed(2)} USD</strong>
        {currency !== "USD" ? (
          <span className="text-zinc-500 dark:text-zinc-400"> (≈ {convertedLabel})</span>
        ) : null}
      </p>

      {!open ? (
        <button
          type="button"
          className="mt-3 inline-flex rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          onClick={() => setOpen(true)}
        >
          Request payout
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
          <p className="text-sm font-medium text-zinc-900 dark:text-white">
            Cash out ${usdAmount.toFixed(2)} USD
          </p>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500">Payment method</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="payout-method"
                checked={method === "paypal"}
                onChange={() => setMethod("paypal")}
              />
              PayPal (email)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="payout-method"
                checked={method === "venmo"}
                onChange={() => setMethod("venmo")}
              />
              Venmo (username)
            </label>
          </fieldset>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {method === "paypal" ? "PayPal email" : "Venmo username"}
            </label>
            <input
              type={method === "paypal" ? "email" : "text"}
              required
              autoComplete="off"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              placeholder={method === "paypal" ? "you@example.com" : "YourVenmoHandle"}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Preferred currency
            </label>
            <select
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as PayoutCurrency)}
            >
              {PAYOUT_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              Estimated payout: <strong>{convertedLabel}</strong> (live rate; USD balance: ${usdAmount.toFixed(2)})
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Note (optional)</label>
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              maxLength={2000}
              placeholder="Anything we should know for this payout"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Submit request"}
            </button>
            <button
              type="button"
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
