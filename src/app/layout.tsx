import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { ClientProviders } from "@/components/ClientProviders";
import { THEME_STORAGE_KEY } from "@/lib/theme-storage";
import "./globals.css";

/** Runs before paint so `data-theme` matches localStorage / system preference (avoids wrong Tailwind `dark:` on first frame). */
const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var d=document.documentElement;var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}d.setAttribute("data-theme",t);}catch(e){}})();`;

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
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>
        <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
          <ClientProviders>{children}</ClientProviders>
        </body>
      </html>
    </ClerkProvider>
  );
}
