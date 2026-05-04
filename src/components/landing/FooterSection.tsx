"use client";

import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support-contact";
import Link from "next/link";

const footerLinks = [
  { label: "Features", href: "#features" },
  { label: "Demo", href: "#demo" },
  { label: "Pricing", href: "#pricing" },
  { label: "Support", href: "/support" },
  { label: "FAQ", href: "/faq" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Sign in", href: "/sign-in" },
  { label: "Sign up", href: "/sign-up" },
];

export function FooterSection() {
  return (
    <footer className="border-t border-white/5 bg-zinc-950 px-4 py-14 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 text-sm font-bold text-white">
              C
            </span>
            CaptionAI
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
            AI captions for creators who would rather post than stare at a blank caption box.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-10 gap-y-3">
          {footerLinks.map((l) => (
            <a
              key={l.href + l.label}
              href={l.href}
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <Link href="/dashboard" className="text-sm text-zinc-400 transition hover:text-white">
            Dashboard
          </Link>
        </nav>
      </div>
      <div className="mx-auto mt-12 max-w-6xl border-t border-white/5 pt-8 text-center text-xs text-zinc-600 sm:text-left">
        <p>
          <a href={SUPPORT_MAILTO} className="text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="mt-2">
          © {new Date().getFullYear()} CaptionAI. Built for learning and shipping.
        </p>
      </div>
    </footer>
  );
}
