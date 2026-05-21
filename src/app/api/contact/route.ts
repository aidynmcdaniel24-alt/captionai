/**
 * Contact form → Gmail SMTP via Nodemailer (no Resend).
 * Requires: GMAIL_SMTP_USER, GMAIL_SMTP_APP_PASSWORD
 * Delivers to captionaisupport@gmail.com (see SUPPORT_EMAIL).
 */
import { NextResponse } from "next/server";
import { getGmailMailer, verifyGmailMailer } from "@/lib/gmail-mailer";
import { SUPPORT_EMAIL } from "@/lib/support-contact";
import { CONTACT_SUBJECT_OPTIONS, isContactSubject } from "@/lib/contact-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  email?: string;
  message?: string;
  subject?: string;
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = (body.name ?? "").toString().trim();
  const email = (body.email ?? "").toString().trim();
  const message = (body.message ?? "").toString().trim();
  const rawSubject = (body.subject ?? "General Question").toString().trim();
  const subject = isContactSubject(rawSubject) ? rawSubject : CONTACT_SUBJECT_OPTIONS[0];

  if (!name || name.length > 200) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
        details: process.env.NODE_ENV === "development" ? err : undefined,
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
        error: "Could not send your message. Check Gmail app password and try again, or email us directly.",
        details: process.env.NODE_ENV === "development" ? err : undefined,
      },
      { status: 502 }
    );
  }
}
