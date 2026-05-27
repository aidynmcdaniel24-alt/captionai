"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const IOS_DISMISS_KEY = "captionai:ios-install-dismissed";

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const platform = window.navigator.platform || "";
  const isIPad =
    /iPad/.test(ua) ||
    (platform === "MacIntel" && typeof window.navigator.maxTouchPoints === "number" && window.navigator.maxTouchPoints > 1);
  return /iPhone|iPod/.test(ua) || isIPad;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    navStandalone === true
  );
}

/**
 * "Install App" button for the dashboard header.
 *
 * - Chrome / Android / Edge / desktop: listens for `beforeinstallprompt`, hides
 *   the button until the browser confirms install eligibility, then fires
 *   `prompt()` on click.
 * - iOS Safari: shows a small modal with the share-to-home-screen instructions
 *   because iOS still does not expose a programmatic install prompt.
 * - If the app is already installed (running in standalone mode) the button
 *   does not render.
 */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [iosCapable, setIosCapable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isStandalone()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot detection on mount
      setInstalled(true);
      return;
    }

    if (isIos()) {
      setIosCapable(true);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!deferredPrompt && !iosCapable) return null;

  async function handleInstallClick() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
        }
      } catch {
        /* user dismissed */
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }
    if (iosCapable) {
      setShowIosHelp(true);
      try {
        window.sessionStorage?.removeItem(IOS_DISMISS_KEY);
      } catch {
        /* sessionStorage unavailable */
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title="Install CaptionAI to your home screen"
        className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-800 transition hover:bg-purple-100 dark:border-purple-700/60 dark:bg-purple-950/50 dark:text-purple-200 dark:hover:bg-purple-900/40 ${className}`}
      >
        <span aria-hidden>📲</span>
        <span>Install app</span>
      </button>

      {showIosHelp ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 px-4 pb-6 sm:items-center sm:pb-0"
          role="dialog"
          aria-modal="true"
          aria-label="Install CaptionAI on iPhone"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Install on your iPhone
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
              <li>
                Tap the <span className="font-semibold">Share</span> button at the bottom of
                Safari <span aria-hidden>⬆️</span>
              </li>
              <li>
                Scroll and tap <span className="font-semibold">Add to Home Screen</span>{" "}
                <span aria-hidden>➕</span>
              </li>
              <li>
                Tap <span className="font-semibold">Add</span> in the top-right corner.
              </li>
            </ol>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              CaptionAI will then open like a real app, full-screen, with no Safari address bar.
            </p>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
