import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Affiliate program",
  description: "Share CaptionAI with your audience and earn recurring rewards when referrals subscribe.",
};

export default function AffiliatePage() {
  return (
    <MarketingShell
      title="Affiliate program"
      subtitle="Partnerships and referrals for creators and agencies."
    >
      <p>
        CaptionAI offers a referral program for creators and agencies. Share your unique signup link from your
        profile; when friends join and upgrade, you help grow the community.
      </p>
      <ul className="list-inside list-disc space-y-2">
        <li>Get your personal link on the Profile page after you sign in.</li>
        <li>
          Short links use <code className="rounded bg-zinc-800 px-1">/r/yourcode</code> which forwards to signup
          with your referral attached.
        </li>
        <li>
          Reward details and payout thresholds are communicated at onboarding — we’re happy to discuss custom
          tiers for volume partners.
        </li>
      </ul>
      <div className="flex flex-wrap gap-3 pt-4">
        <Link
          href="/sign-up"
          className="inline-flex rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-500"
        >
          Create an account
        </Link>
        <Link
          href="/support"
          className="inline-flex rounded-full border border-zinc-600 px-6 py-3 text-sm font-semibold hover:bg-zinc-900"
        >
          Contact partnerships
        </Link>
      </div>
    </MarketingShell>
  );
}
