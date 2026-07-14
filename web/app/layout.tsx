import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LocationBootPrompt } from "@/components/LocationBootPrompt";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://niklo.nikloapp.workers.dev",
  ),
  title: {
    default: "Niklo: Karachi plans",
    template: "%s · Niklo",
  },
  description:
    "A friendly Karachi guide for plans beyond dinner, from sport and screens to parks, culture, and more.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Niklo: Karachi plans",
    description:
      "Find sport, screens, games, parks, culture, and other good Karachi plans.",
    type: "website",
    locale: "en_PK",
    siteName: "Niklo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <Script
          id="cloudflare-web-analytics"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          type="module"
          strategy="afterInteractive"
          data-cf-beacon='{"token":"84e834826315410294fc6f56d6199dd0"}'
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-paper"
        >
          Skip to content
        </a>
        <LocationBootPrompt />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
