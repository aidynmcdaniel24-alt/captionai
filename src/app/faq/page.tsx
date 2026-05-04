import type { Metadata } from "next";
import { MarketingDocLayout } from "@/components/marketing/MarketingDocLayout";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support-contact";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about CaptionAI — platforms, plans, billing, security, and support.",
};

const faqs: { q: string; a: string }[] = [
  {
    q: "What is CaptionAI?",
    a: "CaptionAI is a web app that uses AI to generate social media captions from a short description of your photo or topic. You pick the platform and tone, and we suggest multiple captions you can copy and post.",
  },
  {
    q: "How does CaptionAI work?",
    a: "You describe your photo or topic (for example, “sunset beach hike”), choose a platform like Instagram or TikTok, and choose a tone such as funny or professional. Our AI returns several caption options with hashtags. You can regenerate until you find one you love.",
  },
  {
    q: "Which platforms are supported?",
    a: "You can tailor captions for Instagram, TikTok, LinkedIn, and Twitter/X. The wording is adjusted so it fits each platform’s style.",
  },
  {
    q: "What does the free plan include?",
    a: "The free plan includes a limited number of caption generations per day so you can try the product. Limits may change; check your dashboard for today’s usage.",
  },
  {
    q: "How do I upgrade to Pro?",
    a: "Sign in, open your dashboard, and use the upgrade flow to subscribe with a card via Stripe. Once active, you’ll see Pro on your account and can generate captions without the free daily cap.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Go to Settings → use Manage subscription (or your billing portal link) to cancel or change your plan in Stripe’s customer portal. You keep access until the end of your billing period unless stated otherwise.",
  },
  {
    q: "How do I reset my password?",
    a: "CaptionAI uses Clerk for sign-in. On the sign-in page, use “Forgot password” (or your identity provider’s reset flow) to receive a reset email. You can also manage connected accounts from Account settings.",
  },
  {
    q: "Is my data safe?",
    a: "We use industry-standard providers: Clerk for authentication, Supabase for app data, Stripe for payments, and Groq for AI generation. We collect only what’s needed to run the service; see our Privacy Policy for details.",
  },
  {
    q: "What payment methods are accepted?",
    a: "Subscriptions are processed by Stripe. Supported cards and payment methods depend on Stripe and your region; you’ll see available options at checkout.",
  },
  {
    q: "How do I contact support?",
    a: `Visit our Support page for the contact form, or email us at ${SUPPORT_EMAIL}. You can also check this FAQ for common questions.`,
  },
];

export default function FaqPage() {
  return (
    <MarketingDocLayout
      title="Frequently asked questions"
      subtitle="Quick answers about plans, billing, security, and how CaptionAI works."
      eyebrow="Help"
    >
      <div className="space-y-3">
        {faqs.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-zinc-200/90 bg-white shadow-sm transition-shadow open:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:open:shadow-purple-950/20"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium text-zinc-900 marker:hidden [&::-webkit-details-marker]:hidden dark:text-zinc-100">
              <span className="pr-2">{item.q}</span>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700 transition-transform duration-200 group-open:rotate-180 dark:border-purple-500/30 dark:bg-purple-950/40 dark:text-purple-300"
                aria-hidden
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <div className="border-t border-zinc-100 px-5 pb-5 pt-0 text-[15px] leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              <p className="pt-3">{item.a}</p>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-purple-200/80 bg-purple-50/80 p-6 dark:border-purple-500/20 dark:bg-purple-950/25">
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          Still stuck?{" "}
          <Link href="/support" className="font-medium text-purple-700 underline decoration-purple-300 underline-offset-2 hover:text-purple-600 dark:text-purple-400 dark:decoration-purple-600 dark:hover:text-purple-300">
            Contact support
          </Link>{" "}
          or{" "}
          <a
            href={SUPPORT_MAILTO}
            className="font-medium text-purple-700 underline decoration-purple-300 underline-offset-2 hover:text-purple-600 dark:text-purple-400 dark:decoration-purple-600 dark:hover:text-purple-300"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    </MarketingDocLayout>
  );
}
