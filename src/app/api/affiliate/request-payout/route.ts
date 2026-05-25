import { NextResponse } from "next/server";
import {
  convertUsdCentsToCurrency,
  fetchExchangeRatesFromUsd,
  formatCurrencyAmount,
  isPayoutCurrency,
  type PayoutCurrency,
} from "@/lib/affiliate-currency";
import { getAffiliatePayoutSummary, isValidPaypalEmail, isValidVenmoUsername } from "@/lib/affiliate-payout";
import { getGmailMailer, verifyGmailMailer } from "@/lib/gmail-mailer";
import {
  RATE_LIMITS,
  rateLimitByUser,
  requireUser,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import {
  readJsonWithLimit,
  REQUEST_SIZE_LIMITS,
} from "@/lib/security/request-size";
import { escapeHtml, sanitizeText } from "@/lib/security/sanitize";
import { supabaseServer } from "@/lib/supabase/server";
import { SUPPORT_EMAIL } from "@/lib/support-contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  paymentMethod?: unknown;
  paymentHandle?: unknown;
  preferredCurrency?: unknown;
  note?: unknown;
};

export async function POST(req: Request) {
  const authResult = await requireUser(req, "affiliate:request-payout");
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const rateLimited = rateLimitByUser(userId, "affiliate:request-payout", RATE_LIMITS.generalApi);
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<Body>(req, REQUEST_SIZE_LIMITS.affiliate);
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const paymentMethod = sanitizeText(body.paymentMethod, { maxLength: 32 }).toLowerCase();
  const paymentHandle = sanitizeText(body.paymentHandle, { maxLength: 200 });
  const preferredCurrency = sanitizeText(body.preferredCurrency ?? "USD", {
    maxLength: 8,
  }).toUpperCase();
  const note = sanitizeText(body.note, { maxLength: 2000, allowLineBreaks: true });

  if (paymentMethod !== "paypal" && paymentMethod !== "venmo") {
    return NextResponse.json({ error: "Choose PayPal or Venmo as your payment method." }, { status: 400 });
  }

  if (!paymentHandle) {
    return NextResponse.json({ error: "Enter your PayPal email or Venmo username." }, { status: 400 });
  }

  if (paymentMethod === "paypal" && !isValidPaypalEmail(paymentHandle)) {
    return NextResponse.json({ error: "Enter a valid PayPal email address." }, { status: 400 });
  }

  if (paymentMethod === "venmo" && !isValidVenmoUsername(paymentHandle)) {
    return NextResponse.json(
      { error: "Venmo username must be 3–30 characters (letters, numbers, - or _)." },
      { status: 400 }
    );
  }

  if (!isPayoutCurrency(preferredCurrency)) {
    return NextResponse.json({ error: "Unsupported currency." }, { status: 400 });
  }

  const { data: statsRow, error: statsErr } = await supabaseServer
    .from("affiliate_stats")
    .select("earnings_cents")
    .eq("affiliate_user_id", userId)
    .maybeSingle();

  if (statsErr) {
    return NextResponse.json(
      { error: safeErrorMessage(statsErr, "Could not load affiliate stats.") },
      { status: 500 }
    );
  }

  const earningsCents = statsRow?.earnings_cents ?? 0;
  const payout = await getAffiliatePayoutSummary(userId, earningsCents);

  if (payout.hasPendingPayout) {
    return NextResponse.json(
      { error: "You already have a pending payout request. We will process it within 3–5 business days." },
      { status: 409 }
    );
  }

  if (payout.availableCents < payout.minPayoutCents) {
    return NextResponse.json(
      {
        error: `Minimum payout is $${(payout.minPayoutCents / 100).toFixed(2)}. Your available balance is $${(payout.availableCents / 100).toFixed(2)}.`,
      },
      { status: 400 }
    );
  }

  const amountCents = payout.availableCents;

  const { data: inserted, error: insertErr } = await supabaseServer
    .from("affiliate_payout_requests")
    .insert({
      affiliate_user_id: userId,
      amount_cents: amountCents,
      payment_method: paymentMethod,
      payment_handle: paymentHandle,
      preferred_currency: preferredCurrency,
      note: note || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("[request-payout] insert:", insertErr.message);
    if (insertErr.message.toLowerCase().includes("affiliate_payout_requests")) {
      return NextResponse.json(
        {
          error:
            "Payout table is missing. Run supabase/affiliate_payout_requests.sql in the Supabase SQL editor.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: safeErrorMessage(insertErr, "Could not create payout request.") },
      { status: 500 }
    );
  }

  const usdFormatted = `$${(amountCents / 100).toFixed(2)}`;
  const rates = await fetchExchangeRatesFromUsd();
  const converted = formatCurrencyAmount(
    convertUsdCentsToCurrency(amountCents, preferredCurrency as PayoutCurrency, rates),
    preferredCurrency as PayoutCurrency
  );

  const mailer = getGmailMailer();
  if (mailer) {
    try {
      await verifyGmailMailer(mailer);
      const methodLabel = paymentMethod === "paypal" ? "PayPal" : "Venmo";
      const safeNote = note ? escapeHtml(note).replace(/\r\n|\n|\r/g, "<br />") : "—";

      await mailer.transporter.sendMail({
        from: `"CaptionAI Affiliate" <${mailer.user}>`,
        to: SUPPORT_EMAIL,
        subject: `[CaptionAI] Affiliate payout request — ${usdFormatted}`,
        text: [
          `Affiliate user ID: ${userId}`,
          `Amount (USD): ${usdFormatted}`,
          `Preferred payout currency: ${preferredCurrency} (approx. ${converted})`,
          `Payment method: ${methodLabel}`,
          `${methodLabel} handle: ${paymentHandle}`,
          `Note: ${note || "—"}`,
          `Request ID: ${inserted?.id ?? "—"}`,
        ].join("\n"),
        html: `
          <h2>Affiliate payout request</h2>
          <p><strong>Affiliate user ID:</strong> ${escapeHtml(userId)}</p>
          <p><strong>Amount to cash out (USD):</strong> ${escapeHtml(usdFormatted)}</p>
          <p><strong>Preferred currency:</strong> ${escapeHtml(preferredCurrency)} (≈ ${escapeHtml(converted)})</p>
          <p><strong>Payment method:</strong> ${escapeHtml(methodLabel)}</p>
          <p><strong>${escapeHtml(methodLabel)}:</strong> ${escapeHtml(paymentHandle)}</p>
          <p><strong>Note:</strong> ${safeNote}</p>
          <p><strong>Request ID:</strong> ${escapeHtml(inserted?.id ?? "—")}</p>
        `.trim(),
      });
    } catch (e) {
      console.error("[request-payout] email:", e instanceof Error ? e.message : e);
    }
  } else {
    console.warn("[request-payout] Gmail not configured; payout saved but email not sent.");
  }

  return NextResponse.json({
    ok: true,
    requestId: inserted?.id,
    amountCents,
    amountUsd: usdFormatted,
    preferredCurrency,
    convertedAmount: converted,
  });
}
