export const MIN_PAYOUT_CENTS = 1000;

export const PAYOUT_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "MXN",
  "BRL",
  "JPY",
] as const;

export type PayoutCurrency = (typeof PAYOUT_CURRENCIES)[number];

/** Fallback USD → currency multipliers (1 USD = rate units of currency). Updated periodically offline. */
export const FALLBACK_RATES_FROM_USD: Record<PayoutCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.53,
  MXN: 17.1,
  BRL: 5.05,
  JPY: 149,
};

export function isPayoutCurrency(value: string): value is PayoutCurrency {
  return (PAYOUT_CURRENCIES as readonly string[]).includes(value);
}

export type ExchangeRatesFromUsd = Record<PayoutCurrency, number>;

/** Fetch live USD base rates; falls back to fixed table on failure. */
export async function fetchExchangeRatesFromUsd(): Promise<ExchangeRatesFromUsd> {
  const targets = PAYOUT_CURRENCIES.filter((c) => c !== "USD").join(",");
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${targets}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return { ...FALLBACK_RATES_FROM_USD };
    }
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rates: ExchangeRatesFromUsd = { ...FALLBACK_RATES_FROM_USD };
    for (const code of PAYOUT_CURRENCIES) {
      if (code === "USD") {
        continue;
      }
      const live = data.rates?.[code];
      if (typeof live === "number" && live > 0) {
        rates[code] = live;
      }
    }
    return rates;
  } catch {
    return { ...FALLBACK_RATES_FROM_USD };
  }
}

export function convertUsdCentsToCurrency(
  usdCents: number,
  currency: PayoutCurrency,
  rates: ExchangeRatesFromUsd
): number {
  const usd = usdCents / 100;
  const rate = rates[currency] ?? FALLBACK_RATES_FROM_USD[currency];
  const amount = usd * rate;
  if (currency === "JPY") {
    return Math.round(amount);
  }
  return Math.round(amount * 100) / 100;
}

export function formatCurrencyAmount(amount: number, currency: PayoutCurrency): string {
  if (currency === "JPY") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
