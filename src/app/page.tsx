import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "CaptionAI — AI captions for Instagram, TikTok & more",
  description:
    "Generate scroll-stopping social captions in seconds. Try a free live demo—then sign up for Pro with unlimited generations.",
};

export default function Home() {
  return <LandingPage />;
}
