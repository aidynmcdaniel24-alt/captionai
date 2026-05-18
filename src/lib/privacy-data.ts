export type PrivacyBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: { label?: string; text: string }[] };

export type PrivacySection = {
  id: string;
  number: number;
  title: string;
  blocks: PrivacyBlock[];
};

export const PRIVACY_LAST_UPDATED = "May 1, 2026";

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: "introduction",
    number: 1,
    title: "Introduction",
    blocks: [
      {
        type: "paragraph",
        text: 'This Privacy Policy explains how CaptionAI ("we", "us") collects, uses, and shares information when you use our website and services (the "Service").',
      },
    ],
  },
  {
    id: "information-we-collect",
    number: 2,
    title: "Information we collect",
    blocks: [
      { type: "paragraph", text: "We may collect:" },
      {
        type: "list",
        items: [
          {
            label: "Account data:",
            text: "such as name, email address, and authentication data processed by Clerk when you sign up or sign in.",
          },
          {
            label: "Usage and app data:",
            text: "such as subscription plan, caption usage counts, generated caption history stored in our database, and technical logs needed to operate the Service.",
          },
          {
            label: "Payment data:",
            text: "processed by Stripe; we do not store full card numbers on our servers.",
          },
          {
            label: "Content you submit:",
            text: "text you enter to generate captions (e.g. topic descriptions), platform and tone selections, and AI outputs returned to you.",
          },
        ],
      },
    ],
  },
  {
    id: "how-we-use",
    number: 3,
    title: "How we use information",
    blocks: [
      { type: "paragraph", text: "We use information to:" },
      {
        type: "list",
        items: [
          { text: "Provide, maintain, and improve CaptionAI" },
          { text: "Authenticate users and enforce plan limits" },
          { text: "Process payments and subscriptions" },
          { text: "Communicate about your account, security, or support requests" },
          { text: "Comply with law and protect rights and safety" },
        ],
      },
    ],
  },
  {
    id: "third-party",
    number: 4,
    title: "Third-party services",
    blocks: [
      { type: "paragraph", text: "We rely on service providers, including:" },
      {
        type: "list",
        items: [
          { label: "Clerk", text: "— authentication and user session management" },
          { label: "Supabase", text: "— database storage for subscriptions, usage, and caption history" },
          { label: "Stripe", text: "— payment processing and customer billing portal" },
          { label: "Groq", text: "— AI model APIs used to generate caption text from your prompts" },
        ],
      },
      {
        type: "paragraph",
        text: "Each provider processes data under their own terms and privacy policies. We recommend reviewing those documents for details on how they handle data.",
      },
    ],
  },
  {
    id: "cookies",
    number: 5,
    title: "Cookies and similar technologies",
    blocks: [
      {
        type: "paragraph",
        text: "We and our vendors may use cookies and similar technologies for authentication, security, preferences, and analytics as described by Clerk and our hosting provider. You can control cookies through your browser settings.",
      },
    ],
  },
  {
    id: "retention",
    number: 6,
    title: "Data retention",
    blocks: [
      {
        type: "paragraph",
        text: "We retain information as long as needed to provide the Service, comply with legal obligations, resolve disputes, and enforce agreements. Retention periods may vary by data type; contact us if you have questions about deletion.",
      },
    ],
  },
  {
    id: "your-rights",
    number: 7,
    title: "Your rights",
    blocks: [
      {
        type: "paragraph",
        text: "Depending on where you live, you may have rights to access, correct, delete, or export personal data, or to object to or restrict certain processing. To exercise rights, contact us at the email below. You may also manage some account details through your Clerk profile and billing through Stripe's portal.",
      },
    ],
  },
  {
    id: "security",
    number: 8,
    title: "Security",
    blocks: [
      {
        type: "paragraph",
        text: "We implement reasonable technical and organizational measures to protect information. No method of transmission over the Internet is 100% secure.",
      },
    ],
  },
  {
    id: "children",
    number: 9,
    title: "Children",
    blocks: [
      {
        type: "paragraph",
        text: "The Service is not directed at children under 13 (or the minimum age in your jurisdiction). Do not use it if you are under that age.",
      },
    ],
  },
  {
    id: "international",
    number: 10,
    title: "International transfers",
    blocks: [
      {
        type: "paragraph",
        text: "Your information may be processed in countries other than where you live. Where required, we use appropriate safeguards for cross-border transfers.",
      },
    ],
  },
  {
    id: "changes",
    number: 11,
    title: "Changes to this policy",
    blocks: [
      {
        type: "paragraph",
        text: 'We may update this Privacy Policy from time to time. We will post the updated version and revise the "Last updated" date.',
      },
    ],
  },
  {
    id: "contact",
    number: 12,
    title: "Contact",
    blocks: [
      {
        type: "paragraph",
        text: "Privacy questions: contact us using the details in the section below.",
      },
    ],
  },
];
