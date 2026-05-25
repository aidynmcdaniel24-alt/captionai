import { SUPPORT_EMAIL } from "@/lib/support-contact";

export type FaqItem = { id: string; q: string; a: string };

export type FaqCategory = {
  id: string;
  title: string;
  /** Short label for category pills */
  pillLabel: string;
  icon: "rocket" | "pricing" | "sparkles" | "account" | "technical" | "affiliate";
  iconClass: string;
  iconBgClass: string;
  items: FaqItem[];
};

export const FAQ_ALL_PILL = "all" as const;

export type FaqPillId =
  | typeof FAQ_ALL_PILL
  | "getting-started"
  | "plans-pricing"
  | "features"
  | "account-billing"
  | "technical"
  | "affiliate-program";

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    pillLabel: "Getting Started",
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
      {
        id: "need-account",
        q: "Do I need to create an account to use CaptionAI?",
        a: "No, you can try the live demo on the homepage without signing up. Create a free account to save captions and get 5 generations per day.",
      },
      {
        id: "free-generations",
        q: "How many captions can I generate for free?",
        a: "Free plan includes 5 caption generations per day. Each generation gives you 3 caption options. Upgrade to Pro for unlimited generations.",
      },
      {
        id: "what-makes-different",
        q: "What makes CaptionAI different from other caption tools?",
        a: "CaptionAI tailors every caption specifically to your platform and tone. TikTok captions sound like TikTok, LinkedIn captions sound like LinkedIn. We also rate each caption so you know which one will perform best.",
      },
      {
        id: "first-caption",
        q: "How do I generate my first caption?",
        a: "Type what your post is about in the topic field, type your platform like Instagram or TikTok, type your tone like funny or professional, then click Generate. You’ll get 3 captions instantly.",
      },
      {
        id: "mobile-support",
        q: "Can I use CaptionAI on my phone?",
        a: "Yes! CaptionAI is fully mobile responsive and works great on iPhone and Android browsers.",
      },
    ],
  },
  {
    id: "plans-pricing",
    title: "Plans & Pricing",
    pillLabel: "Pricing",
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
      {
        id: "cancel-anytime",
        q: "Can I cancel anytime?",
        a: "Yes, you can cancel your Pro subscription at any time. You keep Pro access until the end of your current billing period.",
      },
      {
        id: "money-back-guarantee",
        q: "Is there a money back guarantee?",
        a: `Yes, we offer a 30-day money back guarantee. If you’re not happy with Pro for any reason, contact us at ${SUPPORT_EMAIL} within 30 days for a full refund.`,
      },
      {
        id: "monthly-vs-annual",
        q: "What is the difference between monthly and annual Pro?",
        a: "Monthly Pro is $9/month. Annual Pro is $79/year which saves you 27% compared to paying monthly. Both plans include the same unlimited features.",
      },
      {
        id: "refunds",
        q: "Do you offer refunds?",
        a: `Yes, contact ${SUPPORT_EMAIL} within 30 days of purchase for a full refund, no questions asked.`,
      },
      {
        id: "switch-billing-cycle",
        q: "Can I switch between monthly and annual?",
        a: "Yes, go to your Profile page and click Manage Subscription to switch between monthly and annual billing.",
      },
    ],
  },
  {
    id: "features",
    title: "Features",
    pillLabel: "Features",
    icon: "sparkles",
    iconClass: "text-purple-600 dark:text-purple-400",
    iconBgClass: "bg-purple-500/15 dark:bg-purple-500/20",
    items: [
      {
        id: "platforms",
        q: "Which platforms are supported?",
        a: "You can tailor captions for Instagram, TikTok, LinkedIn, and Twitter/X. The wording is adjusted so it fits each platform’s style.",
      },
      {
        id: "custom-platform",
        q: "Can I type my own custom platform?",
        a: "Yes! The platform field is a text input so you can type any platform like YouTube Shorts, Discord, Newsletter, Threads, or anything you want.",
      },
      {
        id: "available-tones",
        q: "What tones are available?",
        a: "The tone field is a text input so you can type anything. Try funny, professional, hype, inspirational, sarcastic, luxury, casual, educational, or any style you want.",
      },
      {
        id: "other-languages",
        q: "Can I generate captions in other languages?",
        a: "Yes! CaptionAI supports English, Spanish, French, German, Portuguese, Italian, Japanese, and Korean.",
      },
      {
        id: "hook-library",
        q: "What is the Hook Library?",
        a: "The Hook Library is a collection of 50+ proven viral hooks organized by category. Click any hook to copy it and automatically fill your topic field. Great for when you need inspiration.",
      },
      {
        id: "caption-score",
        q: "What is Caption Score?",
        a: "Every caption gets a score out of 100 based on hook strength, emotional engagement, call to action, platform fit, and originality. Use it to pick the caption most likely to perform well.",
      },
      {
        id: "ab-test",
        q: "What is the A/B Test feature?",
        a: "A/B testing lets you generate two different caption variations and track which one performs better. Use it to learn what style your audience responds to most.",
      },
      {
        id: "save-favorites",
        q: "Can I save my favorite captions?",
        a: "Yes! Click the star icon on any caption to save it to your Favorites tab. Access your saved captions anytime from the dashboard.",
      },
      {
        id: "best-time-to-post",
        q: "What is the best time to post feature?",
        a: "Each caption shows an AI-recommended best time to post based on the platform and content type. For example gym content on TikTok performs best Friday evenings.",
      },
      {
        id: "schedule-posts",
        q: "Can I schedule posts directly from CaptionAI?",
        a: "Yes! Each caption has a Schedule button that opens Buffer with your caption pre-filled. Buffer is a free tool that lets you schedule posts to any social media platform.",
      },
      {
        id: "caption-templates",
        q: "What are caption templates?",
        a: "Caption templates are quick-start topics you can click to instantly fill the topic field. Templates include Product Launch, Behind the Scenes, Sale Announcement, Motivational Quote, and more.",
      },
    ],
  },
  {
    id: "account-billing",
    title: "Account & Billing",
    pillLabel: "Account",
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
      {
        id: "change-email-password",
        q: "How do I change my email or password?",
        a: "Go to your Profile page and click Edit name and email or manage your account settings. CaptionAI uses Clerk for authentication so you can update your details there.",
      },
      {
        id: "update-profile-picture",
        q: "How do I update my profile picture?",
        a: "Go to your Profile page and click Change photo. You can upload a photo from your computer or take one with your camera on mobile.",
      },
      {
        id: "delete-account",
        q: "How do I delete my account?",
        a: `Contact us at ${SUPPORT_EMAIL} and we will delete your account and all associated data within 48 hours.`,
      },
      {
        id: "multiple-devices",
        q: "Can I use CaptionAI on multiple devices?",
        a: "Yes! Your account works on any device. Sign in on your phone, tablet, or computer and all your captions and settings sync automatically.",
      },
    ],
  },
  {
    id: "technical",
    title: "Technical",
    pillLabel: "Technical",
    icon: "technical",
    iconClass: "text-sky-600 dark:text-sky-400",
    iconBgClass: "bg-sky-500/15 dark:bg-sky-500/20",
    items: [
      {
        id: "data-safety",
        q: "Is my data safe?",
        a: "We use industry-standard providers: Clerk for authentication, Supabase for app data, Stripe for payments, and Groq for AI generation. We collect only what’s needed to run the service; see our Privacy Policy for details.",
      },
      {
        id: "store-captions",
        q: "Does CaptionAI store my captions?",
        a: "Yes, your generated captions are saved to your caption history so you can access them later. You can view your history at captionai.app/history and delete any entries you want.",
      },
      {
        id: "ai-model",
        q: "What AI model does CaptionAI use?",
        a: "CaptionAI uses Groq with the LLaMA 3.3 70B model to generate captions. This is one of the fastest and most capable AI models available.",
      },
      {
        id: "slow-generation",
        q: "Why are my captions sometimes slow to generate?",
        a: "Caption generation usually takes 3-8 seconds. If it takes longer it may be due to high demand. Try refreshing the page and generating again.",
      },
      {
        id: "captions-not-generating",
        q: "What should I do if captions are not generating?",
        a: `First check your internet connection. Then try refreshing the page. If the problem persists contact us at ${SUPPORT_EMAIL} and we will help you.`,
      },
      {
        id: "supported-browsers",
        q: "What browsers are supported?",
        a: "CaptionAI works on all modern browsers including Chrome, Safari, Firefox, and Edge. We recommend Chrome or Safari for the best experience.",
      },
    ],
  },
  {
    id: "affiliate-program",
    title: "Affiliate Program",
    pillLabel: "Affiliate",
    icon: "affiliate",
    iconClass: "text-pink-600 dark:text-pink-400",
    iconBgClass: "bg-pink-500/15 dark:bg-pink-500/20",
    items: [
      {
        id: "what-is-affiliate",
        q: "What is the CaptionAI affiliate program?",
        a: "The affiliate program lets you earn money by referring people to CaptionAI. Share your unique link and earn 20% commission when someone you refer upgrades to Pro.",
      },
      {
        id: "commission-amount",
        q: "How much commission do I earn?",
        a: "You earn 20% of the first payment from each person you refer. That is $1.80 for a monthly Pro subscription and $15.80 for an annual Pro subscription.",
      },
      {
        id: "join-affiliate",
        q: "How do I join the affiliate program?",
        a: "Sign in to CaptionAI and go to the Affiliate page from your profile. Click Enroll to get your unique tracking link instantly. No application or approval needed.",
      },
      {
        id: "payout-timing",
        q: "When do I get paid?",
        a: "Payouts are processed manually within 3-5 business days of your request. You need a minimum of $10 in earnings to request a payout.",
      },
      {
        id: "minimum-payout",
        q: "What is the minimum payout?",
        a: "The minimum payout is $10. Once you reach $10 in earnings go to the Affiliate page and click Request Payout.",
      },
      {
        id: "track-referrals",
        q: "How do I track my referrals?",
        a: "The Affiliate page shows your total clicks, signups, paying customers, and earnings in real time. Click Refresh stats to see the latest numbers.",
      },
      {
        id: "payout-methods",
        q: "What payment methods are available for payouts?",
        a: "We currently pay out via PayPal or Venmo. You can also request your preferred currency when submitting a payout request.",
      },
    ],
  },
];

export const FAQ_PILLS: { id: FaqPillId; label: string }[] = [
  { id: FAQ_ALL_PILL, label: "All" },
  ...FAQ_CATEGORIES.map((c) => ({ id: c.id as FaqPillId, label: c.pillLabel })),
];

export function filterFaqCategories(query: string, categoryId?: FaqPillId): FaqCategory[] {
  const trimmed = query.trim().toLowerCase();
  const base =
    categoryId && categoryId !== FAQ_ALL_PILL && !trimmed
      ? FAQ_CATEGORIES.filter((c) => c.id === categoryId)
      : FAQ_CATEGORIES;

  if (!trimmed) return base;

  return base
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.q.toLowerCase().includes(trimmed) ||
          item.a.toLowerCase().includes(trimmed) ||
          category.title.toLowerCase().includes(trimmed) ||
          category.pillLabel.toLowerCase().includes(trimmed),
      ),
    }))
    .filter((category) => category.items.length > 0);
}
