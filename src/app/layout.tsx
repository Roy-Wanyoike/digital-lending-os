import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://youngsend.com'),
  title: {
    default: "Youngsend — Financial Operating System for Global Commerce",
    template: "%s — Youngsend",
  },
  description: "The Financial Operating System and Trust Network for Global Commerce. Escrow, Wallet, Payment Links, and AI-powered trust.",
  keywords: ["Youngsend", "escrow", "payment", "trust network", "global commerce", "fintech", "payment links", "digital wallet", "cross-border payments"],
  icons: {
    icon: "/logo.svg",
  },
  other: {
    'theme-color': '#047857',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://youngsend.com',
    siteName: 'Youngsend',
    title: 'Youngsend — Financial Operating System for Global Commerce',
    description: 'Escrow, wallets, payment links, and AI-powered trust — all in one secure platform built for businesses that trade across borders.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Youngsend — Financial Operating System for Global Commerce',
    description: 'Escrow, wallets, payment links, and AI-powered trust — all in one secure platform built for businesses that trade across borders.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-emerald-600 focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
