import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support-contact";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for CaptionAI.",
};

export default function TermsPage() {
  return (
    <MarketingShell title="Terms of Service" subtitle="Last updated: May 1, 2026. Please read these terms carefully.">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">1. Agreement to terms</h2>
        <p>
          By accessing or using CaptionAI (“Service”), operated by CaptionAI (“we”, “us”), you agree to these Terms of
          Service. If you do not agree, do not use the Service.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">2. Description of service</h2>
        <p>
          CaptionAI provides tools to generate AI-assisted social media captions based on text you provide. Output may be
          inaccurate or inappropriate; you are responsible for reviewing content before publishing.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">3. Accounts and eligibility</h2>
        <p>
          You must provide accurate information and keep your account secure. You are responsible for activity under your
          account. We may suspend or terminate accounts that violate these terms or harm the Service or other users.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">4. Acceptable use</h2>
        <p>You agree not to misuse the Service, including by:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Violating laws or third-party rights</li>
          <li>Generating unlawful, harassing, deceptive, or infringing content</li>
          <li>Attempting to probe, scrape, or overload our systems without permission</li>
          <li>Reverse engineering or circumventing security or billing controls</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">5. Payments and subscriptions</h2>
        <p>
          Paid plans are billed through our payment processor (Stripe). Fees, taxes, and renewal terms are presented at
          checkout. By subscribing, you authorize recurring charges until you cancel as permitted.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">6. Refund policy</h2>
        <p>
          Subscription refunds are handled according to applicable law and our policies at checkout. Where required, you may
          cancel renewal through your billing portal; payments already processed may not be refundable except as stated at
          purchase or required by law.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">7. Intellectual property</h2>
        <p>
          The Service, branding, and software are owned by CaptionAI or licensors. You retain rights to content you submit.
          You grant us a limited license to process your inputs to provide the Service. AI-generated suggestions may not be
          unique; you are responsible for ensuring your use does not infringe others’ rights.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">8. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED “AS IS” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">9. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, CAPTIONAI WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL. OUR TOTAL LIABILITY FOR CLAIMS
          ARISING OUT OF THE SERVICE IS LIMITED TO THE GREATER OF AMOUNTS YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM
          OR ONE HUNDRED DOLLARS (US $100), EXCEPT WHERE PROHIBITED BY LAW.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">10. Termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or terminate access for breach, risk, or operational
          reasons. Provisions that by nature should survive will survive termination.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">11. Changes</h2>
        <p>
          We may update these terms by posting a new version and updating the “Last updated” date. Continued use after
          changes constitutes acceptance where permitted by law.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">12. Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a href={SUPPORT_MAILTO} className="text-purple-400 hover:text-purple-300">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
    </MarketingShell>
  );
}
