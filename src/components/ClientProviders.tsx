"use client";

import { InactivityLogout } from "@/components/InactivityLogout";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { ReferralClaim } from "@/components/ReferralClaim";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { Theme } from "@/lib/theme-storage";

export function ClientProviders({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: Theme;
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <InactivityLogout />
      <ReferralClaim />
      <PwaRegister />
      {children}
    </ThemeProvider>
  );
}
