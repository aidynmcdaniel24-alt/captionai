"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

const CONSENT_STORAGE_KEY = "captionai-cookie-consent";

/**
 * Bottom cookie consent banner shown once to new visitors. Consent is stored in
 * localStorage so the banner never reappears after the user accepts.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage unavailable (private mode / SSR) — show banner anyway.
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, "accepted");
    } catch {
      // Ignore write failures; banner just won't persist.
    }
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-4 sm:pb-4"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700 dark:bg-zinc-900/95">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              We use cookies to improve your experience. By continuing you accept
              our{" "}
              <Link
                href="/privacy"
                className="font-medium text-purple-600 underline-offset-2 hover:underline dark:text-purple-400"
              >
                Privacy Policy
              </Link>
              .
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/privacy"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-purple-300 px-4 text-sm font-medium text-purple-700 transition hover:bg-purple-50 dark:border-purple-500/40 dark:text-purple-300 dark:hover:bg-purple-950/40"
              >
                Learn more
              </Link>
              <button
                type="button"
                onClick={accept}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
