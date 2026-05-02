"use client";

import { AuthContinueSection } from "./AuthContinueSection";
import { LandingHeader } from "./LandingHeader";
import { HeroSection } from "./HeroSection";
import { FeaturesSection } from "./FeaturesSection";
import { LiveDemoSection } from "./LiveDemoSection";
import { PricingSection } from "./PricingSection";
import { FooterSection } from "./FooterSection";

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-0 h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full bg-purple-600/[0.12] blur-[100px]" />
        <div className="absolute right-0 top-1/3 h-[min(60vw,420px)] w-[min(60vw,420px)] translate-x-1/4 rounded-full bg-violet-600/[0.1] blur-[90px]" />
        <div className="absolute bottom-0 left-1/3 h-[280px] w-[480px] rounded-full bg-fuchsia-900/10 blur-[80px]" />
      </div>

      <LandingHeader />
      <main>
        <HeroSection />
        <AuthContinueSection />
        <FeaturesSection />
        <LiveDemoSection />
        <PricingSection />
      </main>
      <FooterSection />
    </div>
  );
}
