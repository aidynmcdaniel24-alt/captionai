// Curated library of proven viral hook openers, grouped by category and
// tagged with the social platforms they tend to perform best on. Used by the
// dashboard "Hook Library" tab. Tap a hook to copy it AND drop it into the
// caption topic field as a starting point.

export type HookCategoryId =
  | "curiosity"
  | "story"
  | "controversial"
  | "question"
  | "number"
  | "pov";

export type HookPlatform =
  | "Instagram"
  | "TikTok"
  | "LinkedIn"
  | "Twitter/X"
  | "Facebook"
  | "Threads"
  | "YouTube"
  | "Pinterest"
  | "Bluesky";

export type ViralHook = {
  id: string;
  text: string;
  platforms: HookPlatform[];
};

export type ViralHookCategory = {
  id: HookCategoryId;
  label: string;
  description: string;
  hooks: ViralHook[];
};

const ALL_FEED: HookPlatform[] = [
  "Instagram",
  "TikTok",
  "LinkedIn",
  "Twitter/X",
  "Facebook",
  "Threads",
];

const SHORT_FORM: HookPlatform[] = ["TikTok", "Instagram", "Threads", "Twitter/X"];

const PRO_PLATFORMS: HookPlatform[] = ["LinkedIn", "Twitter/X", "Threads"];

export const VIRAL_HOOKS: ViralHookCategory[] = [
  {
    id: "curiosity",
    label: "Curiosity",
    description: "Open a loop the reader has to close.",
    hooks: [
      { id: "cur-1", text: "Nobody talks about this, but…", platforms: ALL_FEED },
      { id: "cur-2", text: "The truth about ___ that nobody tells you.", platforms: ALL_FEED },
      {
        id: "cur-3",
        text: "What they don't tell you about ___.",
        platforms: ALL_FEED,
      },
      { id: "cur-4", text: "I shouldn't be saying this, but…", platforms: SHORT_FORM },
      {
        id: "cur-5",
        text: "Most people get ___ completely wrong.",
        platforms: ALL_FEED,
      },
      { id: "cur-6", text: "There's a reason ___ keeps happening.", platforms: ALL_FEED },
      {
        id: "cur-7",
        text: "Here's the part of ___ that nobody posts about.",
        platforms: SHORT_FORM,
      },
      { id: "cur-8", text: "The thing nobody wants to admit:", platforms: ALL_FEED },
      {
        id: "cur-9",
        text: "Read this before you ___ again.",
        platforms: ["Instagram", "TikTok", "Twitter/X", "Threads"],
      },
      {
        id: "cur-10",
        text: "I figured out why ___, and it's not what you think.",
        platforms: ALL_FEED,
      },
    ],
  },
  {
    id: "story",
    label: "Story",
    description: "Open with a real moment, then pay it off.",
    hooks: [
      {
        id: "sto-1",
        text: "I failed at this for 3 years until…",
        platforms: ALL_FEED,
      },
      {
        id: "sto-2",
        text: "This one thing changed everything for me.",
        platforms: ALL_FEED,
      },
      {
        id: "sto-3",
        text: "Two years ago I almost gave up. Here's what saved me.",
        platforms: PRO_PLATFORMS,
      },
      {
        id: "sto-4",
        text: "A customer said something this week that I can't stop thinking about.",
        platforms: ["LinkedIn", "Instagram", "Facebook", "Threads"],
      },
      {
        id: "sto-5",
        text: "Last Tuesday taught me more than 12 months of work.",
        platforms: PRO_PLATFORMS,
      },
      {
        id: "sto-6",
        text: "I spent $___ on ___ so you don't have to. Here's what I learned.",
        platforms: ALL_FEED,
      },
      {
        id: "sto-7",
        text: "Three years ago I quit my job. Here's everything I'd do differently.",
        platforms: PRO_PLATFORMS,
      },
      {
        id: "sto-8",
        text: "The day I stopped trying to ___ is the day everything changed.",
        platforms: ALL_FEED,
      },
      {
        id: "sto-9",
        text: "I almost didn't post this, but here we go.",
        platforms: SHORT_FORM,
      },
    ],
  },
  {
    id: "controversial",
    label: "Controversial",
    description: "Stake a clear, polarizing position.",
    hooks: [
      { id: "con-1", text: "Unpopular opinion: ___.", platforms: ALL_FEED },
      { id: "con-2", text: "Hot take: ___.", platforms: ALL_FEED },
      { id: "con-3", text: "I said what I said.", platforms: SHORT_FORM },
      {
        id: "con-4",
        text: "This is going to upset some people, but…",
        platforms: ALL_FEED,
      },
      {
        id: "con-5",
        text: "Most ___ advice is keeping you broke.",
        platforms: PRO_PLATFORMS,
      },
      { id: "con-6", text: "Sorry, not sorry — ___.", platforms: SHORT_FORM },
      {
        id: "con-7",
        text: "The ___ industry doesn't want you to know this.",
        platforms: ALL_FEED,
      },
      {
        id: "con-8",
        text: "I'll die on this hill: ___.",
        platforms: ["Twitter/X", "Threads", "Bluesky", "LinkedIn"],
      },
      {
        id: "con-9",
        text: "We need to stop pretending ___ works.",
        platforms: ALL_FEED,
      },
    ],
  },
  {
    id: "question",
    label: "Question",
    description: "Make the reader feel called out (in a good way).",
    hooks: [
      { id: "que-1", text: "Be honest…", platforms: ALL_FEED },
      { id: "que-2", text: "Am I the only one who ___?", platforms: ALL_FEED },
      { id: "que-3", text: "Can we talk about ___?", platforms: ALL_FEED },
      {
        id: "que-4",
        text: "Why does nobody talk about ___?",
        platforms: ALL_FEED,
      },
      { id: "que-5", text: "How is ___ still a thing?", platforms: SHORT_FORM },
      {
        id: "que-6",
        text: "What's the one thing you wish you'd known about ___?",
        platforms: ["Instagram", "LinkedIn", "Facebook", "Threads"],
      },
      {
        id: "que-7",
        text: "Tell me you ___ without telling me you ___.",
        platforms: SHORT_FORM,
      },
      {
        id: "que-8",
        text: "Quick question: who else ___?",
        platforms: ALL_FEED,
      },
      {
        id: "que-9",
        text: "If you could only keep one ___, which would it be?",
        platforms: ALL_FEED,
      },
    ],
  },
  {
    id: "number",
    label: "Number",
    description: "Open with a specific number — instantly clickable.",
    hooks: [
      {
        id: "num-1",
        text: "3 things I wish I knew about ___ at 22.",
        platforms: ALL_FEED,
      },
      {
        id: "num-2",
        text: "The #1 mistake people make with ___.",
        platforms: ALL_FEED,
      },
      {
        id: "num-3",
        text: "5 ___ I'd tell my younger self.",
        platforms: ALL_FEED,
      },
      {
        id: "num-4",
        text: "$0 to $10k: the 4 moves that actually worked.",
        platforms: PRO_PLATFORMS,
      },
      {
        id: "num-5",
        text: "I tested 7 ___ so you don't have to. Here's the winner.",
        platforms: ALL_FEED,
      },
      {
        id: "num-6",
        text: "100 days of ___ — the honest results.",
        platforms: ALL_FEED,
      },
      {
        id: "num-7",
        text: "Steal my 3-step ___ framework.",
        platforms: PRO_PLATFORMS,
      },
      {
        id: "num-8",
        text: "If I had to start ___ from zero, I'd do these 5 things.",
        platforms: PRO_PLATFORMS,
      },
      {
        id: "num-9",
        text: "30 seconds. One question. Saved me from a bad ___.",
        platforms: SHORT_FORM,
      },
    ],
  },
  {
    id: "pov",
    label: "POV (TikTok only)",
    description: "Native short-form openers that drop the viewer into a scene.",
    hooks: [
      { id: "pov-1", text: "POV: you finally ___.", platforms: ["TikTok"] },
      { id: "pov-2", text: "POV: when you realize ___.", platforms: ["TikTok"] },
      { id: "pov-3", text: "POV: it's your last day at ___.", platforms: ["TikTok"] },
      { id: "pov-4", text: "POV: you opened your own ___.", platforms: ["TikTok"] },
      { id: "pov-5", text: "POV: your ___ glow-up actually worked.", platforms: ["TikTok"] },
      { id: "pov-6", text: "POV: you're the friend who ___.", platforms: ["TikTok"] },
      { id: "pov-7", text: "POV: you stopped chasing ___ and started ___.", platforms: ["TikTok"] },
      { id: "pov-8", text: "POV: it's Sunday and you have NO plans. Bliss.", platforms: ["TikTok"] },
      { id: "pov-9", text: "POV: you just made the move everyone said wouldn't work.", platforms: ["TikTok"] },
    ],
  },
];

export function totalHookCount(): number {
  return VIRAL_HOOKS.reduce((acc, cat) => acc + cat.hooks.length, 0);
}
