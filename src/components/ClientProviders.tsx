"use client";

import { InactivityLogout } from "@/components/InactivityLogout";
import { ReferralClaim } from "@/components/ReferralClaim";
import { ThemeProvider } from "@/components/ThemeProvider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <InactivityLogout />
      <ReferralClaim />
      {children}
    </ThemeProvider>
  );
}
