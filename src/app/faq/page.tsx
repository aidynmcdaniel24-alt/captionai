import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
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
    <MarketingShell title="Frequently asked questions" subtitle="Quick answers about using CaptionAI.">
      <ul className="!mt-6 space-y-8">
        {faqs.map((item) => (
          <li key={item.q} className="border-b border-zinc-800 pb-8 last:border-0">
            <h2 className="text-lg font-semibold text-white">{item.q}</h2>
            <p className="mt-2 text-zinc-400">{item.a}</p>
          </li>
        ))}
      </ul>
      <p className="!mt-10 text-sm text-zinc-500">
        Still stuck?{" "}
        <Link href="/support" className="text-purple-400 hover:text-purple-300">
          Contact support
        </Link>{" "}
        or{" "}
        <a href={SUPPORT_MAILTO} className="text-purple-400 hover:text-purple-300">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </MarketingShell>
  );
}
