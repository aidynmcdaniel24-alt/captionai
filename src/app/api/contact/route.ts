import { NextResponse } from "next/server";
import { Resend } from "resend";
import { SUPPORT_EMAIL } from "@/lib/support-contact";

export const runtime = "nodejs";

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

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Email is not configured. Set RESEND_API_KEY on the server." },
      { status: 503 }
    );
  }

  if (!from) {
    return NextResponse.json(
      {
        error:
          "Email is not configured. Set RESEND_FROM_EMAIL (verified sender in Resend), e.g. CaptionAI <noreply@yourdomain.com>.",
      },
      { status: 503 }
    );
  }

  const resend = new Resend(apiKey);

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\r\n|\n|\r/g, "<br />");

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [SUPPORT_EMAIL],
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

    if (error) {
      console.error("[contact/resend]", error);
      return NextResponse.json(
        {
          error:
            "Could not send your message. Please email us directly or try again later.",
          details: typeof error.message === "string" ? error.message : undefined,
        },
        { status: 502 }
      );
    }

    console.info("[contact/sent]", {
      resendId: data?.id,
      to: SUPPORT_EMAIL,
      replyTo: email.slice(0, 40),
    });

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (e) {
    console.error("[contact/resend]", e);
    return NextResponse.json(
      {
        error: "Could not send your message. Please email us directly or try again later.",
      },
      { status: 502 }
    );
  }
}
