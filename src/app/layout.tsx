import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { ClientProviders } from "@/components/ClientProviders";
import { parseTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme-storage";
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
    "Free AI caption generator for social media captions — Instagram captions, TikTok captions, LinkedIn captions, and more.",
  keywords: [
    "AI caption generator",
    "social media captions",
    "Instagram captions",
    "TikTok captions",
    "LinkedIn captions",
    "caption generator free",
  ],
  applicationName: "CaptionAI",
  verification: {
    google: "_mZFRSlXhZILEG4l5dqO8nTkVyG-B-mxBTiLUX5nTIY",
  },
};

async function getInitialTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  return parseTheme(cookieStore.get(THEME_STORAGE_KEY)?.value) ?? "light";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialTheme = await getInitialTheme();

  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        data-theme={initialTheme}
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
          <ClientProviders initialTheme={initialTheme}>{children}</ClientProviders>
        </body>
      </html>
    </ClerkProvider>
  );
}
