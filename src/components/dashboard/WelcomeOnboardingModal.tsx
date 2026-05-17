"use client";

const STORAGE_KEY = "captionai_onboarding_seen";

export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

const steps = [
  {
    title: "Describe your photo or idea",
    detail: "Type what your post is about in the text box — a sentence is enough.",
    icon: "✏️",
  },
  {
    title: "Pick your platform and tone",
    detail: "Choose Instagram, TikTok, LinkedIn, and the vibe you want (funny, pro, hype, and more).",
    icon: "🎯",
  },
  {
    title: "Click Generate",
    detail: "Get 3 AI captions instantly — copy, favorite, or regenerate until one fits.",
    icon: "✨",
  },
] as const;

export function WelcomeOnboardingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  function handleClose() {
    markOnboardingSeen();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <h2 id="welcome-title" className="text-xl font-semibold text-zinc-900 dark:text-white">
          Welcome to CaptionAI! Here is how to get started
        </h2>
        <ol className="mt-6 space-y-4">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-lg dark:bg-purple-950/50"
                aria-hidden
              >
                {step.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <span className="text-purple-600 dark:text-purple-400">{index + 1}.</span>{" "}
                  {step.title}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={handleClose}
          className="mt-8 w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500"
        >
          Got it, let&apos;s go!
        </button>
      </div>
    </div>
  );
}
