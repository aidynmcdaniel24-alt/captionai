export type TermsBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] };

export type TermsSection = {
  id: string;
  number: number;
  title: string;
  blocks: TermsBlock[];
};

export const TERMS_LAST_UPDATED = "May 1, 2026";

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "agreement",
    number: 1,
    title: "Agreement to terms",
    blocks: [
      {
        type: "paragraph",
        text: 'By accessing or using CaptionAI ("Service"), operated by CaptionAI ("we", "us"), you agree to these Terms of Service. If you do not agree, do not use the Service.',
      },
    ],
  },
  {
    id: "description",
    number: 2,
    title: "Description of service",
    blocks: [
      {
        type: "paragraph",
        text: "CaptionAI provides tools to generate AI-assisted social media captions based on text you provide. Output may be inaccurate or inappropriate; you are responsible for reviewing content before publishing.",
      },
    ],
  },
  {
    id: "accounts",
    number: 3,
    title: "Accounts and eligibility",
    blocks: [
      {
        type: "paragraph",
        text: "You must provide accurate information and keep your account secure. You are responsible for activity under your account. We may suspend or terminate accounts that violate these terms or harm the Service or other users.",
      },
    ],
  },
  {
    id: "acceptable-use",
    number: 4,
    title: "Acceptable use",
    blocks: [
      { type: "paragraph", text: "You agree not to misuse the Service, including by:" },
      {
        type: "list",
        items: [
          "Violating laws or third-party rights",
          "Generating unlawful, harassing, deceptive, or infringing content",
          "Attempting to probe, scrape, or overload our systems without permission",
          "Reverse engineering or circumventing security or billing controls",
        ],
      },
    ],
  },
  {
    id: "payments",
    number: 5,
    title: "Payments and subscriptions",
    blocks: [
      {
        type: "paragraph",
        text: "Paid plans are billed through our payment processor (Stripe). Fees, taxes, and renewal terms are presented at checkout. By subscribing, you authorize recurring charges until you cancel as permitted.",
      },
    ],
  },
  {
    id: "refunds",
    number: 6,
    title: "Refund policy",
    blocks: [
      {
        type: "paragraph",
        text: "Subscription refunds are handled according to applicable law and our policies at checkout. Where required, you may cancel renewal through your billing portal; payments already processed may not be refundable except as stated at purchase or required by law.",
      },
    ],
  },
  {
    id: "ip",
    number: 7,
    title: "Intellectual property",
    blocks: [
      {
        type: "paragraph",
        text: "The Service, branding, and software are owned by CaptionAI or licensors. You retain rights to content you submit. You grant us a limited license to process your inputs to provide the Service. AI-generated suggestions may not be unique; you are responsible for ensuring your use does not infringe others' rights.",
      },
    ],
  },
  {
    id: "disclaimers",
    number: 8,
    title: "Disclaimers",
    blocks: [
      {
        type: "paragraph",
        text: 'THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      },
    ],
  },
  {
    id: "liability",
    number: 9,
    title: "Limitation of liability",
    blocks: [
      {
        type: "paragraph",
        text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, CAPTIONAI WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL. OUR TOTAL LIABILITY FOR CLAIMS ARISING OUT OF THE SERVICE IS LIMITED TO THE GREATER OF AMOUNTS YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM OR ONE HUNDRED DOLLARS (US $100), EXCEPT WHERE PROHIBITED BY LAW.",
      },
    ],
  },
  {
    id: "termination",
    number: 10,
    title: "Termination",
    blocks: [
      {
        type: "paragraph",
        text: "You may stop using the Service at any time. We may suspend or terminate access for breach, risk, or operational reasons. Provisions that by nature should survive will survive termination.",
      },
    ],
  },
  {
    id: "changes",
    number: 11,
    title: "Changes",
    blocks: [
      {
        type: "paragraph",
        text: 'We may update these terms by posting a new version and updating the "Last updated" date. Continued use after changes constitutes acceptance where permitted by law.',
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
        text: "Questions about these terms: use the contact details in the section below.",
      },
    ],
  },
];
