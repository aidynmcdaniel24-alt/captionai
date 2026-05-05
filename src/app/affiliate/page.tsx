import type { Metadata } from "next";
import Link from "next/link";
import { AffiliatePageClient } from "@/components/affiliate/AffiliatePageClient";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Affiliate program",
  description: "Share CaptionAI with your audience and earn rewards when referrals subscribe to Pro.",
};

export default function AffiliatePage() {
  return (
    <MarketingShell
      title="Affiliate program"
      subtitle="Track clicks, sign-ups, and earnings when your audience upgrades to Pro."
    >
      <AffiliatePageClient />
      <div className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">How it works</h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-zinc-600 dark:text-zinc-400">
          <li>
            Your short link looks like <code className="rounded bg-zinc-200 px-1 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">yoursite.com/r/yourcode</code> and sends visitors to sign-up with your code stored.
          </li>
          <li>When they subscribe to Pro, Stripe records the payment and your dashboard updates with commission (20% of the payment).</li>
          <li>You can also copy the full sign-up URL from the dashboard if you prefer not to use the short link.</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
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
            Contact support
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
