/**
 * Contact form → Gmail SMTP via Nodemailer (no Resend).
 * Requires: GMAIL_SMTP_USER, GMAIL_SMTP_APP_PASSWORD
 * Delivers to captionaisupport@gmail.com (see SUPPORT_EMAIL).
 */
import { NextResponse } from "next/server";
import { getGmailMailer, verifyGmailMailer } from "@/lib/gmail-mailer";
import {
  RATE_LIMITS,
  rateLimitByIp,
  safeErrorMessage,
} from "@/lib/security/api-guard";
import {
  readJsonWithLimit,
  REQUEST_SIZE_LIMITS,
} from "@/lib/security/request-size";
import {
  escapeHtml,
  isValidEmail,
  sanitizeEmail,
  sanitizeText,
} from "@/lib/security/sanitize";
import { SUPPORT_EMAIL } from "@/lib/support-contact";
import { CONTACT_SUBJECT_OPTIONS, isContactSubject } from "@/lib/contact-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  subject?: unknown;
};

export async function POST(req: Request) {
  const rateLimited = rateLimitByIp(
    req,
    "contact:submit",
    RATE_LIMITS.contact,
    "You've sent the contact form too many times. Please wait an hour and try again."
  );
  if (rateLimited) return rateLimited;

  const bodyResult = await readJsonWithLimit<Body>(req, REQUEST_SIZE_LIMITS.contact);
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const name = sanitizeText(body.name, { maxLength: 200 });
  const email = sanitizeEmail(body.email);
  const message = sanitizeText(body.message, { maxLength: 8000, allowLineBreaks: true });
  const rawSubject = sanitizeText(body.subject ?? "General Question", { maxLength: 120 });
  const subject = isContactSubject(rawSubject) ? rawSubject : CONTACT_SUBJECT_OPTIONS[0];

  if (!name || name.length > 200) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  if (!message || message.length < 10) {
    return NextResponse.json(
      { error: "Please enter a message (at least 10 characters)." },
      { status: 400 }
    );
  }

  if (message.length > 8000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  const mailer = getGmailMailer();

  if (!mailer) {
    return NextResponse.json(
      {
        error:
          "Gmail SMTP is not configured. Set GMAIL_SMTP_USER (e.g. captionaisupport@gmail.com) and GMAIL_SMTP_APP_PASSWORD (16-character Google App Password), then redeploy.",
      },
      { status: 503 }
    );
  }

  try {
    await verifyGmailMailer(mailer);
  } catch (e) {
    const err = e instanceof Error ? e.message : "SMTP verify failed";
    console.error("[contact/gmail] verify:", err);
    return NextResponse.json(
      {
        error:
          "Email is not configured correctly. Use a Google App Password for captionaisupport@gmail.com (not your normal Gmail password).",
        details: safeErrorMessage(e, undefined),
      },
      { status: 503 }
    );
  }

  const fromAddress = `"CaptionAI Support" <${mailer.user}>`;

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\r\n|\n|\r/g, "<br />");

  try {
    const info = await mailer.transporter.sendMail({
      from: fromAddress,
      to: SUPPORT_EMAIL,
      replyTo: `"${name.replace(/"/g, "")}" <${email}>`,
      subject: `[CaptionAI] ${subject} — from ${name}`,
      text: [`Name: ${name}`, `Email: ${email}`, `Subject: ${subject}`, "", message].join("\n"),
      html: `
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <hr />
        <p>${safeMessage}</p>
      `.trim(),
    });

    console.info("[contact/gmail]", {
      messageId: info.messageId,
      from: mailer.user,
      to: SUPPORT_EMAIL,
    });

    return NextResponse.json({ ok: true, messageId: info.messageId ?? null });
  } catch (e) {
    const err = e instanceof Error ? e.message : "SMTP error";
    console.error("[contact/gmail] send:", err);
    return NextResponse.json(
      {
        error: "Could not send your message. Please try again or email us directly.",
        details: safeErrorMessage(e, undefined),
      },
      { status: 502 }
    );
  }
}
