"use client";

import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const MESSAGE_MAX = 200;

export function TestimonialSubmitModal({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { isSignedIn, isLoaded, user } = useUser();

  const defaultName = useMemo(() => {
    if (!user) return "";
    return (
      user.fullName?.trim() ||
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      ""
    );
  }, [user]);

  const [name, setName] = useState(() => defaultName);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<
    | null
    | {
        status: "approved" | "rejected" | "pending";
        message: string;
        rejection_reason?: string;
      }
  >(null);
  const [nameTouched, setNameTouched] = useState(false);

  const displayName = nameTouched ? name : name || defaultName;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");

    const finalName = (nameTouched ? name : name || defaultName).trim();
    if (!finalName) {
      setError("Please enter your name.");
      return;
    }
    if (!title.trim()) {
      setError("Please add your role or title.");
      return;
    }
    if (!message.trim()) {
      setError("Please write a short message.");
      return;
    }
    if (message.length > MESSAGE_MAX) {
      setError(`Message must be ${MESSAGE_MAX} characters or fewer.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          title: title.trim(),
          message: message.trim(),
          rating,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
        status?: "approved" | "rejected" | "pending";
        message?: string;
        rejection_reason?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not submit. Try again.");
        return;
      }
      const status = data.status ?? "pending";
      setResult({
        status,
        message:
          data.message ??
          (status === "approved"
            ? "Your testimonial was approved and is now live."
            : status === "rejected"
              ? "Your testimonial was not approved."
              : "Your testimonial is awaiting review."),
        rejection_reason: data.rejection_reason,
      });
      if (status === "approved") {
        onSubmitted();
      }
    } catch {
      setError("Could not submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const displayRating = hoverRating ?? rating;
  const charsLeft = MESSAGE_MAX - message.length;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="testimonial-modal-title"
        onClick={onClose}
      >
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-8 dark:border-white/10 dark:bg-zinc-900"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M4.3 4.3a1 1 0 0 1 1.4 0L10 8.6l4.3-4.3a1 1 0 1 1 1.4 1.4L11.4 10l4.3 4.3a1 1 0 1 1-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 0 1-1.4-1.4L8.6 10 4.3 5.7a1 1 0 0 1 0-1.4Z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <h2
            id="testimonial-modal-title"
            className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-white"
          >
            Share your experience
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Tell other creators how CaptionAI helps you. Submissions are auto-moderated
            and approved testimonials go live immediately.
          </p>

          {!isLoaded ? (
            <p className="mt-6 text-sm text-zinc-500">Loading…</p>
          ) : !isSignedIn ? (
            <div className="mt-6 rounded-2xl border border-purple-200 bg-purple-50 p-5 text-sm text-purple-900 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-100">
              <p>You need to sign in before sharing a testimonial.</p>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-full border border-purple-400 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100 dark:text-purple-100 dark:hover:bg-purple-500/20"
                >
                  Create account
                </Link>
              </div>
            </div>
          ) : result ? (
            result.status === "approved" ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                <p className="font-medium">Approved — thanks!</p>
                <p className="mt-1 text-emerald-800/80 dark:text-emerald-100/80">
                  {result.message}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Done
                </button>
              </div>
            ) : result.status === "rejected" ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                <p className="font-medium">Testimonial not approved</p>
                <p className="mt-1 text-rose-800/80 dark:text-rose-100/80">
                  Our automated moderator could not approve this submission.
                </p>
                {result.rejection_reason ? (
                  <p className="mt-2 rounded-md border border-rose-300/60 bg-white/60 px-3 py-2 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                    <span className="font-semibold">Reason:</span>{" "}
                    {result.rejection_reason}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-rose-800/70 dark:text-rose-100/70">
                  You can edit your testimonial and try again, or contact support if
                  you believe this was a mistake.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="inline-flex items-center justify-center rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-transparent dark:text-rose-100 dark:hover:bg-rose-500/10"
                  >
                    Edit and try again
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <p className="font-medium">Submitted — awaiting review</p>
                <p className="mt-1 text-amber-800/80 dark:text-amber-100/80">
                  {result.message}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                >
                  Done
                </button>
              </div>
            )
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  maxLength={80}
                  onChange={(e) => {
                    setNameTouched(true);
                    setName(e.target.value);
                  }}
                  placeholder="Your name"
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Title / role
                </label>
                <input
                  type="text"
                  value={title}
                  maxLength={80}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='e.g. "Instagram Creator" or "Marketing Manager"'
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    Message
                  </label>
                  <span
                    className={`text-xs tabular-nums ${
                      charsLeft < 20 ? "text-amber-500" : "text-zinc-500"
                    }`}
                  >
                    {charsLeft} left
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={message}
                  maxLength={MESSAGE_MAX}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What do you love about CaptionAI?"
                  className="mt-1 w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Rating
                </label>
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = n <= displayRating;
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} star${n === 1 ? "" : "s"}`}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(null)}
                        onFocus={() => setHoverRating(n)}
                        onBlur={() => setHoverRating(null)}
                        onClick={() => setRating(n)}
                        className="rounded-full p-1 transition hover:scale-110"
                      >
                        <svg
                          viewBox="0 0 20 20"
                          className={`h-7 w-7 transition-colors ${
                            active
                              ? "text-amber-400"
                              : "text-zinc-300 dark:text-zinc-600"
                          }`}
                          fill="currentColor"
                        >
                          <path d="M9.05.97a1 1 0 0 1 1.9 0l1.9 5.86h6.16a1 1 0 0 1 .59 1.8l-4.98 3.62 1.9 5.86a1 1 0 0 1-1.54 1.12L10 15.6l-4.98 3.62a1 1 0 0 1-1.54-1.12l1.9-5.86L.41 8.62a1 1 0 0 1 .59-1.8h6.16L9.05.97Z" />
                        </svg>
                      </button>
                    );
                  })}
                  <span className="ml-2 text-sm text-zinc-500">
                    {displayRating} / 5
                  </span>
                </div>
              </div>

              {error ? (
                <p
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-500 disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit testimonial"}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
