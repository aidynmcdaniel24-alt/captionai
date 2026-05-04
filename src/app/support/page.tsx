"use client";

import { MarketingShell } from "@/components/marketing/MarketingShell";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support-contact";
import Link from "next/link";
import { useState } from "react";

export default function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
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
      setMessage("");
    } catch {
      setStatus("error");
      setErrorMessage("Could not send. Check your connection and try again.");
    }
  }

  return (
    <MarketingShell
      title="Support"
      subtitle="Questions about CaptionAI or your account? We’re here to help."
    >
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <p className="text-zinc-300">
          Email us directly at{" "}
          <a
            href={SUPPORT_MAILTO}
            className="font-medium text-purple-400 underline decoration-purple-500/50 underline-offset-2 hover:text-purple-300"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-sm text-zinc-500">
          We read every message. For billing issues, include the email you use to sign in.
        </p>
      </div>

      <h2 className="!mt-10 text-lg font-semibold text-white">Send a message</h2>
      <p className="text-sm text-zinc-500">
        Fill out the form below. Your note is sent securely to our team (you’ll see a confirmation on this page).
      </p>

      {status === "success" ? (
        <p className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-emerald-200">
          Thanks — your message was received. We’ll follow up at the email you provided.
        </p>
      ) : null}

      {status === "error" && errorMessage ? (
        <p className="rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 text-red-200" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="!mt-6 space-y-4">
        <div>
          <label htmlFor="support-name" className="mb-1.5 block text-sm font-medium text-zinc-300">
            Name
          </label>
          <input
            id="support-name"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-purple-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={200}
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="support-email" className="mb-1.5 block text-sm font-medium text-zinc-300">
            Email
          </label>
          <input
            id="support-email"
            type="email"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-purple-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={320}
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="support-message" className="mb-1.5 block text-sm font-medium text-zinc-300">
            Message
          </label>
          <textarea
            id="support-message"
            className="min-h-36 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-purple-500"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            minLength={10}
            maxLength={8000}
            placeholder="Tell us what you need help with…"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-xl bg-purple-600 px-5 py-2.5 font-medium text-white hover:bg-purple-500 disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Send message"}
        </button>
      </form>

      <p className="text-sm text-zinc-500">
        More resources:{" "}
        <Link href="/faq" className="text-purple-400 hover:text-purple-300">
          FAQ
        </Link>
        {" · "}
        <Link href="/privacy" className="text-purple-400 hover:text-purple-300">
          Privacy
        </Link>
      </p>
    </MarketingShell>
  );
}
