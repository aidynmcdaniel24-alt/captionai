import nodemailer from "nodemailer";

export type GmailMailer = {
  transporter: nodemailer.Transporter;
  user: string;
};

function smtpPassword(): string | undefined {
  return process.env.GMAIL_SMTP_APP_PASSWORD?.replace(/\s/g, "").trim();
}

function smtpUser(): string | undefined {
  return process.env.GMAIL_SMTP_USER?.trim();
}

/** Gmail SMTP for support form (captionaisupport@gmail.com inbox). */
export function getGmailMailer(): GmailMailer | null {
  const user = smtpUser();
  const pass = smtpPassword();

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

/** Verify SMTP credentials before sending (surfaces auth / app-password errors). */
export async function verifyGmailMailer(mailer: GmailMailer): Promise<void> {
  try {
    await mailer.transporter.verify();
  } catch (primaryErr) {
    const pass = smtpPassword();
    const user = smtpUser();
    if (!user || !pass) {
      throw primaryErr;
    }

    const fallback = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user, pass },
    });

    await fallback.verify();
    mailer.transporter = fallback;
  }
}
