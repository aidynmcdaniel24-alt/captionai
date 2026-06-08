"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support-contact";
import Link from "next/link";

type FooterLink = { label: string; href: string };

const productLinks: FooterLink[] = [
  { label: "Features", href: "/#features" },
  { label: "Live demo", href: "/#demo" },
  { label: "Pricing", href: "/pricing" },
  { label: "Dashboard", href: "/dashboard" },
];

const companyLinks: FooterLink[] = [
  { label: "About", href: "/about" },
  { label: "Changelog", href: "/changelog" },
  { label: "Affiliate program", href: "/affiliate" },
  { label: "How it works", href: "/how-it-works" },
];

const supportLinks: FooterLink[] = [
  { label: "Support", href: "/support" },
  { label: "FAQ", href: "/faq" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

const accountLinks: FooterLink[] = [
  { label: "Sign in", href: "/sign-in" },
  { label: "Sign up", href: "/sign-up" },
];

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {links.map((l) =>
          l.href.startsWith("#") || l.href.startsWith("/#") || l.href.startsWith("mailto:") ? (
            <li key={l.href + l.label}>
              <a
                href={l.href}
                className="text-sm text-zinc-600 transition hover:text-purple-700 dark:text-zinc-400 dark:hover:text-purple-300"
              >
                {l.label}
              </a>
            </li>
          ) : (
            <li key={l.href + l.label}>
              <Link
                href={l.href}
                className="text-sm text-zinc-600 transition hover:text-purple-700 dark:text-zinc-400 dark:hover:text-purple-300"
              >
                {l.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

export function FooterSection() {
  return (
    <footer className="border-t border-zinc-200 bg-white px-4 py-12 sm:px-6 sm:py-16 dark:border-white/5 dark:bg-zinc-950">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white"
          >
            <BrandLogo className="h-8 w-8" />
            CaptionAI
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-600 sm:mt-4 dark:text-zinc-500">
            AI captions for creators who would rather post than stare at a blank caption box.
          </p>
          <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">
            <a
              href={SUPPORT_MAILTO}
              className="underline-offset-2 hover:text-purple-700 hover:underline dark:hover:text-purple-300"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        <FooterColumn title="Product" links={productLinks} />
        <FooterColumn title="Company" links={companyLinks} />
        <div className="grid grid-cols-2 gap-10 sm:col-span-2 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1 lg:gap-6">
          <FooterColumn title="Support" links={supportLinks} />
          <FooterColumn title="Account" links={accountLinks} />
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-6xl border-t border-zinc-200 pt-6 text-center text-xs text-zinc-500 sm:text-left dark:border-white/5 dark:text-zinc-600">
        <p>© {new Date().getFullYear()} CaptionAI. Built for creators who ship.</p>
      </div>
    </footer>
  );
}
