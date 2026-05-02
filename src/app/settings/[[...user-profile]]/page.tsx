import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";

/**
 * Clerk User Profile: email/phone, password, connected accounts, and optional MFA (2FA).
 * Enable strategies under Clerk Dashboard → Configure → Multi-factor (SMS, Authenticator app, etc.).
 * Leave “Require multi-factor authentication” OFF so 2FA stays optional for all users.
 */
export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex text-sm font-medium text-purple-400 transition hover:text-purple-300"
        >
          ← Back to dashboard
        </Link>

        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
          <span className="font-medium text-zinc-200">Account &amp; security</span>
          <span className="mx-2 text-zinc-600">·</span>
          Enable two-factor authentication (2FA) under the Security section below when you are ready—it is optional.
        </div>

        <div className="flex justify-center">
          <UserProfile
            routing="path"
            path="/settings"
            appearance={{
              variables: {
                colorPrimary: "#9333ea",
                colorBackground: "#18181b",
                colorInputBackground: "#09090b",
                colorInputText: "#fafafa",
                colorText: "#fafafa",
                colorTextSecondary: "#a1a1aa",
                borderRadius: "0.75rem",
              },
              elements: {
                rootBox: "w-full max-w-full",
                card: "border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/40",
                navbar: "border-zinc-800 bg-zinc-950/80",
                navbarButton: "text-zinc-300",
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
