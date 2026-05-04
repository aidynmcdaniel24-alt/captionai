import type { Metadata } from "next";
import { MarketingDocLayout } from "@/components/marketing/MarketingDocLayout";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support-contact";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How CaptionAI collects, uses, and protects your information.",
};

const linkClass =
  "font-medium text-purple-700 underline decoration-purple-300 underline-offset-2 hover:text-purple-600 dark:text-purple-400 dark:decoration-purple-600 dark:hover:text-purple-300";

const sectionClass =
  "rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50";
const headingClass =
  "border-b border-purple-200/70 pb-3 text-lg font-semibold text-zinc-900 dark:border-purple-500/25 dark:text-zinc-50";
const proseClass = "mt-4 space-y-4 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400";
const strongClass = "font-semibold text-zinc-800 dark:text-zinc-200";

export default function PrivacyPage() {
  return (
    <MarketingDocLayout
      title="Privacy Policy"
      subtitle="Last updated: May 1, 2026. How we handle your information when you use CaptionAI."
      eyebrow="Legal"
    >
      <div className="space-y-5">
        <article className={sectionClass}>
          <h2 className={headingClass}>1. Introduction</h2>
          <div className={proseClass}>
            <p>
              This Privacy Policy explains how CaptionAI (“we”, “us”) collects, uses, and shares information when you use our
              website and services (the “Service”).
            </p>
          </div>
        </article>

        <article className={sectionClass}>
          <h2 className={headingClass}>2. Information we collect</h2>
          <div className={proseClass}>
            <p>We may collect:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className={strongClass}>Account data:</strong> such as name, email address, and authentication data
                processed by Clerk when you sign up or sign in.
              </li>
              <li>
                <strong className={strongClass}>Usage and app data:</strong> such as subscription plan, caption usage counts,
                generated caption history stored in our database, and technical logs needed to operate the Service.
              </li>
              <li>
                <strong className={strongClass}>Payment data:</strong> processed by Stripe; we do not store full card numbers
                on our servers.
              </li>
              <li>
                <strong className={strongClass}>Content you submit:</strong> text you enter to generate captions (e.g. topic
                descriptions), platform and tone selections, and AI outputs returned to you.
              </li>
            </ul>
          </div>
        </article>

        <article className={sectionClass}>
          <h2 className={headingClass}>3. How we use information</h2>
          <div className={proseClass}>
            <p>We use information to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide, maintain, and improve CaptionAI</li>
              <li>Authenticate users and enforce plan limits</li>
              <li>Process payments and subscriptions</li>
              <li>Communicate about your account, security, or support requests</li>
              <li>Comply with law and protect rights and safety</li>
            </ul>
          </div>
        </article>

        <article className={sectionClass}>
          <h2 className={headingClass}>4. Third-party services</h2>
          <div className={proseClass}>
            <p>We rely on service providers, including:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className={strongClass}>Clerk</strong> — authentication and user session management
              </li>
              <li>
                <strong className={strongClass}>Supabase</strong> — database storage for subscriptions, usage, and caption
                history
              </li>
              <li>
                <strong className={strongClass}>Stripe</strong> — payment processing and customer billing portal
              </li>
              <li>
                <strong className={strongClass}>Groq</strong> — AI model APIs used to generate caption text from your prompts
              </li>
            </ul>
            <p>
              Each provider processes data under their own terms and privacy policies. We recommend reviewing those documents
              for details on how they handle data.
            </p>
          </div>
        </article>

        <article className={sectionClass}>
          <h2 className={headingClass}>5. Cookies and similar technologies</h2>
          <div className={proseClass}>
            <p>
              We and our vendors may use cookies and similar technologies for authentication, security, preferences, and
              analytics as described by Clerk and our hosting provider. You can control cookies through your browser settings.
            </p>
          </div>
        </article>

        <article className={sectionClass}>
          <h2 className={headingClass}>6. Data retention</h2>
          <div className={proseClass}>
            <p>
              We retain information as long as needed to provide the Service, comply with legal obligations, resolve disputes,
              and enforce agreements. Retention periods may vary by data type; contact us if you have questions about deletion.
            </p>
          </div>
        </article>

        <article className={sectionClass}>
          <h2 className={headingClass}>7. Your rights</h2>
          <div className={proseClass}>
            <p>
              Depending on where you live, you may have rights to access, correct, delete, or export personal data, or to
              object to or restrict certain processing. To exercise rights, contact us at the email below. You may also manage
              some account details through your Clerk profile and billing through Stripe’s portal.
            </p>
          </div>
        </article>

        <article className={sectionClass}>
          <h2 className={headingClass}>8. Security</h2>
          <div className={proseClass}>
            <p>
              We implement reasonable technical and organizational measures to protect information. No method of transmission
              over the Internet is 100% secure.
            </p>
          </div>
        </article>

        <article className={sectionClass}>
          <h2 className={headingClass}>9. Children</h2>
          <div className={proseClass}>
            <p>
              The Service is not directed at children under 13 (or the minimum age in your jurisdiction). Do not use it if you
              are under that age.
            </p>
          </div>
        </article>

        <article className={sectionClass}>
          <h2 className={headingClass}>10. International transfers</h2>
          <div className={proseClass}>
            <p>
              Your information may be processed in countries other than where you live. Where required, we use appropriate
              safeguards for cross-border transfers.
            </p>
          </div>
        </article>

        <article className={sectionClass}>
          <h2 className={headingClass}>11. Changes to this policy</h2>
          <div className={proseClass}>
            <p>
              We may update this Privacy Policy from time to time. We will post the updated version and revise the “Last
              updated” date.
            </p>
          </div>
        </article>

        <article className={sectionClass}>
          <h2 className={headingClass}>12. Contact</h2>
          <div className={proseClass}>
            <p>
              Privacy questions:{" "}
              <a href={SUPPORT_MAILTO} className={linkClass}>
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </article>
      </div>
    </MarketingDocLayout>
  );
}
