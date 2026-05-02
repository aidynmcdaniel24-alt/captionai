import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rawSiteUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
const siteUrl = rawSiteUrl.endsWith("/") ? rawSiteUrl.slice(0, -1) : rawSiteUrl;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CaptionAI",
    template: "%s | CaptionAI",
  },
  description:
    "Generate AI-powered social media captions for Instagram, TikTok, LinkedIn, and Twitter.",
  applicationName: "CaptionAI",
  verification: {
    google: "_mZFRSlXhZILEG4l5dqO8nTkVyG-B-mxBTiLUX5nTIY",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
