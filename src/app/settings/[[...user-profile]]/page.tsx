import { SettingsQuickActions } from "@/components/SettingsQuickActions";
import { UserProfile } from "@clerk/nextjs";
import Link from "next/link";

/**
 * Clerk v7+ uses colorForeground / colorMutedForeground (not deprecated colorText / colorTextSecondary).
 * Light panel on dark page keeps WCAG-friendly contrast; neutral tokens drive borders and hover states.
 */
const userProfileAppearance = {
  variables: {
    colorPrimary: "#7c3aed",
    colorPrimaryForeground: "#ffffff",
    colorForeground: "#18181b",
    colorMutedForeground: "#52525b",
    colorMuted: "#e4e4e7",
    colorBackground: "#fafafa",
    colorInput: "#ffffff",
    colorInputForeground: "#18181b",
    colorBorder: "#d4d4d8",
    colorRing: "#9333ea",
    colorNeutral: "#a1a1aa",
    colorDanger: "#dc2626",
    colorModalBackdrop: "rgba(9, 9, 11, 0.65)",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
  },
  elements: {
    rootBox: "w-full max-w-full",
    card: "border border-zinc-300 bg-zinc-50 shadow-2xl shadow-black/30",
    navbar: "border-zinc-200 bg-white",
    navbarButton:
      "text-zinc-700 hover:bg-zinc-100 data-[active=true]:bg-purple-50 data-[active=true]:text-purple-800",
  },
} as const;

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

        <SettingsQuickActions />

        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
          <span className="font-medium text-zinc-200">Account &amp; security</span>
          <span className="mx-2 text-zinc-600">·</span>
          Enable two-factor authentication (2FA) under the Security section below when you are ready—it is optional.
        </div>

        <div className="flex justify-center">
          <UserProfile
            routing="path"
            path="/settings"
            appearance={userProfileAppearance}
          />
        </div>
      </div>
    </main>
  );
}
