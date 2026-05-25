"use client";

import { AuthContinueSection } from "./AuthContinueSection";
import { LandingHeader } from "./LandingHeader";
import { HeroSection } from "./HeroSection";
import { LiveCaptionsCounter } from "./LiveCaptionsCounter";
import { FeaturesSection } from "./FeaturesSection";
import { LiveDemoSection } from "./LiveDemoSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { StatsSection } from "./StatsSection";
import { PricingSection } from "./PricingSection";
import { FooterSection } from "./FooterSection";

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-0 h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full bg-purple-500/[0.07] blur-[100px] dark:bg-purple-600/[0.12]" />
        <div className="absolute right-0 top-1/3 h-[min(60vw,420px)] w-[min(60vw,420px)] translate-x-1/4 rounded-full bg-violet-500/[0.06] blur-[90px] dark:bg-violet-600/[0.1]" />
        <div className="absolute bottom-0 left-1/3 h-[280px] w-[480px] rounded-full bg-fuchsia-400/[0.06] blur-[80px] dark:bg-fuchsia-900/10" />
      </div>

      <LandingHeader />
      <main>
        <HeroSection />
        <LiveCaptionsCounter />
        <AuthContinueSection />
        <FeaturesSection />
        <LiveDemoSection />
        <StatsSection />
        <TestimonialsSection />
        <PricingSection />
      </main>
      <FooterSection />
    </div>
  );
}
