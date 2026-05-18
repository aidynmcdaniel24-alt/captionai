import { SUPPORT_EMAIL } from "@/lib/support-contact";

export type FaqItem = { id: string; q: string; a: string };

export type FaqCategory = {
  id: string;
  title: string;
  icon: "rocket" | "pricing" | "sparkles" | "account" | "technical";
  iconClass: string;
  iconBgClass: string;
  items: FaqItem[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "rocket",
    iconClass: "text-violet-600 dark:text-violet-400",
    iconBgClass: "bg-violet-500/15 dark:bg-violet-500/20",
    items: [
      {
        id: "what-is",
        q: "What is CaptionAI?",
        a: "CaptionAI is a web app that uses AI to generate social media captions from a short description of your photo or topic. You pick the platform and tone, and we suggest multiple captions you can copy and post.",
      },
      {
        id: "how-it-works",
        q: "How does CaptionAI work?",
        a: "You describe your photo or topic (for example, “sunset beach hike”), choose a platform like Instagram or TikTok, and choose a tone such as funny or professional. Our AI returns several caption options with hashtags. You can regenerate until you find one you love.",
      },
    ],
  },
  {
    id: "plans-pricing",
    title: "Plans & Pricing",
    icon: "pricing",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    iconBgClass: "bg-emerald-500/15 dark:bg-emerald-500/20",
    items: [
      {
        id: "free-plan",
        q: "What does the free plan include?",
        a: "The free plan includes a limited number of caption generations per day so you can try the product. Limits may change; check your dashboard for today’s usage.",
      },
      {
        id: "upgrade-pro",
        q: "How do I upgrade to Pro?",
        a: "Sign in, open your dashboard, and use the upgrade flow to subscribe with a card via Stripe. Once active, you’ll see Pro on your account and can generate captions without the free daily cap.",
      },
      {
        id: "payment-methods",
        q: "What payment methods are accepted?",
        a: "Subscriptions are processed by Stripe. Supported cards and payment methods depend on Stripe and your region; you’ll see available options at checkout.",
      },
    ],
  },
  {
    id: "features",
    title: "Features",
    icon: "sparkles",
    iconClass: "text-purple-600 dark:text-purple-400",
    iconBgClass: "bg-purple-500/15 dark:bg-purple-500/20",
    items: [
      {
        id: "platforms",
        q: "Which platforms are supported?",
        a: "You can tailor captions for Instagram, TikTok, LinkedIn, and Twitter/X. The wording is adjusted so it fits each platform’s style.",
      },
    ],
  },
  {
    id: "account-billing",
    title: "Account & Billing",
    icon: "account",
    iconClass: "text-amber-600 dark:text-amber-400",
    iconBgClass: "bg-amber-500/15 dark:bg-amber-500/20",
    items: [
      {
        id: "cancel-subscription",
        q: "How do I cancel my subscription?",
        a: "Go to Settings → use Manage subscription (or your billing portal link) to cancel or change your plan in Stripe’s customer portal. You keep access until the end of your billing period unless stated otherwise.",
      },
      {
        id: "reset-password",
        q: "How do I reset my password?",
        a: "CaptionAI uses Clerk for sign-in. On the sign-in page, use “Forgot password” (or your identity provider’s reset flow) to receive a reset email. You can also manage connected accounts from Account settings.",
      },
      {
        id: "contact-support",
        q: "How do I contact support?",
        a: `Visit our Support page for the contact form, or email us at ${SUPPORT_EMAIL}. You can also search this FAQ for common questions.`,
      },
    ],
  },
  {
    id: "technical",
    title: "Technical",
    icon: "technical",
    iconClass: "text-sky-600 dark:text-sky-400",
    iconBgClass: "bg-sky-500/15 dark:bg-sky-500/20",
    items: [
      {
        id: "data-safety",
        q: "Is my data safe?",
        a: "We use industry-standard providers: Clerk for authentication, Supabase for app data, Stripe for payments, and Groq for AI generation. We collect only what’s needed to run the service; see our Privacy Policy for details.",
      },
    ],
  },
];

export function filterFaqCategories(query: string): FaqCategory[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return FAQ_CATEGORIES;

  return FAQ_CATEGORIES.map((category) => ({
    ...category,
    items: category.items.filter(
      (item) =>
        item.q.toLowerCase().includes(trimmed) ||
        item.a.toLowerCase().includes(trimmed) ||
        category.title.toLowerCase().includes(trimmed),
    ),
  })).filter((category) => category.items.length > 0);
}
