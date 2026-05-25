import "server-only";
import { getGmailMailer, verifyGmailMailer } from "@/lib/gmail-mailer";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "https://captionai.app";

type SendOpts = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

async function sendTransactional(opts: SendOpts): Promise<{ ok: boolean; error?: string }> {
  const mailer = getGmailMailer();
  if (!mailer) {
    console.warn("[emails] GMAIL_SMTP_USER / GMAIL_SMTP_APP_PASSWORD not configured — skipping send.");
    return { ok: false, error: "smtp-not-configured" };
  }

  try {
    await verifyGmailMailer(mailer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "verify-failed";
    console.error("[emails] SMTP verify failed:", msg);
    return { ok: false, error: msg };
  }

  try {
    const info = await mailer.transporter.sendMail({
      from: `"CaptionAI" <${mailer.user}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    console.info("[emails] sent", {
      to: opts.to,
      subject: opts.subject,
      messageId: info.messageId,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send-failed";
    console.error("[emails] send failed:", msg);
    return { ok: false, error: msg };
  }
}

function shell(title: string, bodyHtml: string, ctaUrl: string, ctaLabel: string) {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f1235;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="background:linear-gradient(135deg,#7c3aed,#c026d3);border-radius:18px;padding:24px 28px;color:#fff;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="background:#fff;color:#7c3aed;border-radius:12px;width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;">C</div>
          <div style="font-weight:700;font-size:18px;letter-spacing:.2px;">CaptionAI</div>
        </div>
        <h1 style="margin:18px 0 0;font-size:24px;line-height:1.25;">${title}</h1>
      </div>

      <div style="background:#ffffff;border:1px solid #ece6ff;border-top:none;border-radius:0 0 18px 18px;padding:28px;">
        ${bodyHtml}

        <div style="text-align:center;margin:28px 0 4px;">
          <a href="${ctaUrl}"
             style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 26px;border-radius:9999px;font-weight:600;">
            ${ctaLabel}
          </a>
        </div>

        <hr style="border:none;border-top:1px solid #efeaff;margin:28px 0 18px;" />
        <p style="font-size:12px;color:#6b6480;margin:0;">
          You're receiving this because you signed up for CaptionAI. Questions? Just reply to this email.
        </p>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendWelcomeEmail(to: string, firstName?: string) {
  const name = firstName?.trim() || "creator";
  const dashboard = `${APP_URL}/dashboard`;

  const html = shell(
    "Welcome to CaptionAI 🚀",
    `
      <p style="font-size:16px;line-height:1.6;margin:0 0 14px;">Hey ${name},</p>
      <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">
        Thanks for signing up — you now have AI-powered captions at your fingertips.
        Here's the 60-second tour:
      </p>

      <ol style="font-size:15px;line-height:1.8;padding-left:20px;margin:0 0 18px;">
        <li><b>Open the dashboard</b> and pick a platform (Instagram, TikTok, LinkedIn, X, and more).</li>
        <li><b>Describe your photo or topic</b> in one line — e.g. <i>"coffee shop in New Orleans"</i>.</li>
        <li><b>Pick a tone</b> (funny, professional, hype, inspirational…) and hit <b>Generate captions</b>.</li>
        <li>Copy your favorite, tap the ☆ to save it, and ship it.</li>
      </ol>

      <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">
        You get <b>5 free AI captions every day</b>. Posting daily? Pro unlocks unlimited
        captions, the Viral Hook Library, caption scoring, and best-time-to-post insights.
      </p>

      <p style="font-size:15px;line-height:1.7;margin:0;">
        Welcome aboard — can't wait to see what you create.<br/>
        <b style="color:#7c3aed;">— The CaptionAI team</b>
      </p>
    `,
    dashboard,
    "Open my dashboard",
  );

  const text = `Welcome to CaptionAI!

Hey ${name},

Thanks for signing up. Here's how to get going in 60 seconds:

1. Open the dashboard at ${dashboard}
2. Pick a platform (Instagram, TikTok, LinkedIn, X, and more)
3. Describe your photo or topic in one line ("coffee shop in New Orleans")
4. Pick a tone and tap "Generate captions"
5. Copy your favorite and post it

You get 5 free AI captions every day. Pro unlocks unlimited generations plus the
Viral Hook Library, caption scoring, and best-time-to-post insights.

Welcome aboard,
The CaptionAI team`;

  return sendTransactional({
    to,
    subject: "Welcome to CaptionAI! Here's how to get started 🚀",
    html,
    text,
  });
}

export async function sendProUpgradeEmail(
  to: string,
  opts: { interval: "month" | "year" | "unknown"; firstName?: string },
) {
  const name = opts.firstName?.trim() || "creator";
  const dashboard = `${APP_URL}/dashboard`;
  const planLabel =
    opts.interval === "year"
      ? "Pro annual"
      : opts.interval === "month"
        ? "Pro monthly"
        : "Pro";

  const html = shell(
    "You're now Pro ✨",
    `
      <p style="font-size:16px;line-height:1.6;margin:0 0 14px;">Hey ${name},</p>
      <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">
        Your <b>${planLabel}</b> plan is active. Thanks for backing CaptionAI —
        you've just unlocked everything we offer.
      </p>

      <p style="font-size:15px;line-height:1.7;margin:0 0 8px;font-weight:600;">What you get with Pro:</p>
      <ul style="font-size:15px;line-height:1.8;padding-left:20px;margin:0 0 18px;">
        <li><b>Unlimited captions</b> — no daily cap, ever.</li>
        <li><b>Pro Boost</b> — elite copywriting mode on every generation.</li>
        <li><b>Viral Hook Library</b> — proven openers you can remix in one click.</li>
        <li><b>Caption scoring</b> — see the hook / emotion / CTA / fit / originality breakdown.</li>
        <li><b>Best-time-to-post insights</b> — when to drop each platform's caption.</li>
        <li><b>Brand voice memory</b> — captions tuned to sound like you.</li>
        <li><b>Stripe-managed billing</b> — cancel or change plan from your account any time.</li>
      </ul>

      <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">
        Heads up — you're covered by our <b>30-day money back guarantee</b>. Not feeling it?
        Reply to this email within 30 days and we'll refund you, no questions asked.
      </p>

      <p style="font-size:15px;line-height:1.7;margin:0;">
        Now go make something great.<br/>
        <b style="color:#7c3aed;">— The CaptionAI team</b>
      </p>
    `,
    dashboard,
    "Open my dashboard",
  );

  const text = `You're now Pro!

Hey ${name},

Your ${planLabel} plan is active. Thanks for backing CaptionAI.

What you get with Pro:
- Unlimited captions
- Pro Boost (elite copywriting mode)
- Viral Hook Library
- Caption scoring (hook / emotion / CTA / fit / originality)
- Best-time-to-post insights
- Brand voice memory
- Stripe-managed billing

You're covered by our 30-day money back guarantee — just reply to this email.

Dashboard: ${dashboard}

— The CaptionAI team`;

  return sendTransactional({
    to,
    subject: "You're now Pro! Welcome to unlimited captions ✨",
    html,
    text,
  });
}
