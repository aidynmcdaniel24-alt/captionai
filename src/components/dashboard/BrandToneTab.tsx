"use client";

import { BrandToneSection } from "@/components/dashboard/BrandToneSection";
import { FeatureGate } from "@/components/dashboard/FeatureGate";
import { isAnnualPlan } from "@/lib/plan";

type Props = {
  plan: "free" | "pro" | "annual" | null;
  checkoutLoading: boolean;
  onStartCheckout: (interval?: "month" | "year") => void;
  onProfileChange?: (saved: boolean) => void;
};

export function BrandToneTab({
  plan,
  checkoutLoading,
  onStartCheckout,
  onProfileChange,
}: Props) {
  if (!isAnnualPlan(plan)) {
    return (
      <FeatureGate
        title="Brand Tone Profiles"
        description="Save your brand name, personality, vocabulary, and a sample caption once — every generation will match your voice automatically."
        badge="Annual"
        checkoutLoading={checkoutLoading}
        onStartCheckout={onStartCheckout}
        requiredPlan="annual"
      />
    );
  }

  return <BrandToneSection onProfileChange={onProfileChange} />;
}
