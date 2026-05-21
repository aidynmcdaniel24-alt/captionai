"use client";

import {
  gradientTitleClass,
  MarketingHero,
  MarketingPageShell,
} from "@/components/marketing/MarketingPageShell";
import { CONTACT_SUBJECT_OPTIONS, type ContactSubject } from "@/lib/contact-form";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support-contact";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

type FieldErrors = {
  name?: string;
  email?: string;
  message?: string;
};

function validateSupportForm(params: {
  name: string;
  email: string;
  message: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const name = params.name.trim();
  if (!name) {
    errors.name = "Please enter your name.";
  } else if (name.length > 200) {
    errors.name = "Name is too long.";
  }

  const email = params.email.trim();
  if (!email) {
    errors.email = "Please enter your email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  const message = params.message.trim();
  if (!message) {
    errors.message = "Please enter a message.";
  } else if (message.length < 10) {
    errors.message = "Message must be at least 10 characters.";
  } else if (message.length > 8000) {
    errors.message = "Message is too long (max 8,000 characters).";
  }

  return errors;
}

const inputBaseClass =
  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

function fieldClass(hasError: boolean) {
  return `${inputBaseClass} ${
    hasError
      ? "border-red-400 dark:border-red-500/60"
      : "border-zinc-300 dark:border-zinc-700"
  }`;
}

export function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<ContactSubject>("General Question");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    const errors = validateSupportForm({ name, email, message });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject,
          message: message.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong.");
        return;
      }
      setStatus("success");
      setName("");
      setEmail("");
      setSubject("General Question");
      setMessage("");
      setFieldErrors({});
    } catch {
      setStatus("error");
      setErrorMessage("Could not send. Check your connection and try again.");
    }
  }

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Help center"
        title={<h1 className={gradientTitleClass}>How can we help?</h1>}
        description="Get answers, report issues, or reach our team — we read every message and aim to respond quickly."
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <motion.a
            href={SUPPORT_MAILTO}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="group flex h-full flex-col rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-purple-500/40"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </span>
            <h2 className="mt-4 font-semibold text-zinc-900 dark:text-white">Email support</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Write us directly at{" "}
              <span className="break-all font-medium text-purple-600 dark:text-purple-400">{SUPPORT_EMAIL}</span>
            </p>
            <p className="mt-3 text-sm font-medium text-purple-600 transition group-hover:text-purple-500 dark:text-purple-400">
              Send an email →
            </p>
          </motion.a>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="h-full"
          >
            <Link
              href="/faq"
              className="group flex h-full flex-col rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-purple-500/40"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                  />
                </svg>
              </span>
              <h2 className="mt-4 font-semibold text-zinc-900 dark:text-white">FAQ</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Billing, features, and common questions answered in one place.
              </p>
              <p className="mt-3 text-sm font-medium text-purple-600 transition group-hover:text-purple-500 dark:text-purple-400">
                Browse FAQ →
              </p>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="flex h-full flex-col rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:col-span-2 lg:col-span-1"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            <h2 className="mt-4 font-semibold text-zinc-900 dark:text-white">Response time</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              We respond within{" "}
              <strong className="font-semibold text-zinc-800 dark:text-zinc-200">24 hours</strong>. Billing and account
              issues are prioritized.
            </p>
          </motion.div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="mt-12 rounded-2xl border border-zinc-200/90 border-l-[3px] border-l-purple-500 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:border-l-purple-500 dark:bg-zinc-900/40"
        >
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-white">
            Send us a message
          </h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            Include as much detail as you can (account email, steps to reproduce, screenshots). We never share support
            conversations with third parties.
          </p>

          <AnimatePresence>
            {status === "success" ? (
              <motion.p
                key="success"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="status"
                className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Thanks — your message was received. We&apos;ll follow up at the email you provided, typically within
                  24 hours.
                </span>
              </motion.p>
            ) : null}

            {status === "error" && errorMessage ? (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              >
                {errorMessage}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="support-name" className={labelClass}>
                  Name
                </label>
                <input
                  id="support-name"
                  className={fieldClass(Boolean(fieldErrors.name))}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) {
                      setFieldErrors((f) => ({ ...f, name: undefined }));
                    }
                  }}
                  maxLength={200}
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? "support-name-error" : undefined}
                />
                {fieldErrors.name ? (
                  <p id="support-name-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {fieldErrors.name}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="support-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="support-email"
                  type="email"
                  className={fieldClass(Boolean(fieldErrors.email))}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((f) => ({ ...f, email: undefined }));
                    }
                  }}
                  maxLength={320}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "support-email-error" : undefined}
                />
                {fieldErrors.email ? (
                  <p id="support-email-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <label htmlFor="support-subject" className={labelClass}>
                Subject
              </label>
              <select
                id="support-subject"
                className={fieldClass(false)}
                value={subject}
                onChange={(e) => setSubject(e.target.value as ContactSubject)}
              >
                {CONTACT_SUBJECT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="support-message" className={labelClass}>
                Message
              </label>
              <textarea
                id="support-message"
                className={`min-h-40 ${fieldClass(Boolean(fieldErrors.message))}`}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (fieldErrors.message) {
                    setFieldErrors((f) => ({ ...f, message: undefined }));
                  }
                }}
                maxLength={8000}
                placeholder="Tell us what you need help with…"
                aria-invalid={Boolean(fieldErrors.message)}
                aria-describedby={fieldErrors.message ? "support-message-error" : "support-message-hint"}
              />
              {fieldErrors.message ? (
                <p id="support-message-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                  {fieldErrors.message}
                </p>
              ) : (
                <p id="support-message-hint" className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-500">
                  Minimum 10 characters.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-purple-900/20 transition hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Sending…
                </>
              ) : (
                "Send message"
              )}
            </button>
          </form>

          <p className="mt-8 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            See also:{" "}
            <Link href="/privacy" className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400">
              Privacy
            </Link>
            {" · "}
            <Link href="/terms" className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400">
              Terms
            </Link>
          </p>
        </motion.section>
      </div>
    </MarketingPageShell>
  );
}
