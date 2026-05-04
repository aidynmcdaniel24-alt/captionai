/**
 * Contact form → Gmail SMTP via Nodemailer (no Resend).
 * Requires: GMAIL_SMTP_USER, GMAIL_SMTP_APP_PASSWORD
 */
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { SUPPORT_EMAIL } from "@/lib/support-contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  email?: string;
  message?: string;
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getGmailMailer():
  | { transporter: nodemailer.Transporter; user: string }
  | null {
  const user = process.env.GMAIL_SMTP_USER?.trim();
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD?.replace(/\s/g, "").trim();

  if (!user || !pass) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  return { transporter, user };
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
          "Gmail SMTP is not configured. Set environment variables GMAIL_SMTP_USER (e.g. captionaisupport@gmail.com) and GMAIL_SMTP_APP_PASSWORD (16-character App Password), then redeploy.",
      },
      { status: 503 }
    );
  }

  const fromAddress = `"CaptionAI" <${mailer.user}>`;

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\r\n|\n|\r/g, "<br />");

  try {
    const info = await mailer.transporter.sendMail({
      from: fromAddress,
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `[CaptionAI] Support from ${name}`,
      text: [`Name: ${name}`, `Email: ${email}`, "", message].join("\n"),
      html: `
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <hr />
        <p>${safeMessage}</p>
      `.trim(),
    });

    console.info("[contact/gmail]", {
      messageId: info.messageId,
      to: SUPPORT_EMAIL,
    });

    return NextResponse.json({ ok: true, messageId: info.messageId ?? null });
  } catch (e) {
    const err = e instanceof Error ? e.message : "SMTP error";
    console.error("[contact/gmail]", err);
    return NextResponse.json(
      {
        error: "Could not send your message. Check Gmail app password and try again, or email us directly.",
        details: process.env.NODE_ENV === "development" ? err : undefined,
      },
      { status: 502 }
    );
  }
}
