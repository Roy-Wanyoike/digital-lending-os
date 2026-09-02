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
  metadataBase: new URL('https://digitallendingos.co.ke'),
  title: {
    default: "Digital Lending OS — Multi-Tenant SaaS for Kenyan Digital Credit Providers",
    template: "%s — Digital Lending OS",
  },
  description: "Multi-Tenant SaaS Platform for Kenyan Digital Credit Providers. CBK-compliant lending, M-Pesa integration, automated credit scoring, collections, and multi-tenant management.",
  keywords: ["Digital Lending OS", "Kenya", "digital lending", "CBK", "M-Pesa", "credit scoring", "CRB", "collections", "fintech", "multi-tenant SaaS", "digital credit providers"],
  icons: {
    icon: "/logo.svg",
  },
  other: {
    'theme-color': '#047857',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://digitallendingos.co.ke',
    siteName: 'Digital Lending OS',
    title: 'Digital Lending OS — Multi-Tenant SaaS for Kenyan Digital Credit Providers',
    description: 'CBK-compliant lending, M-Pesa integration, automated credit scoring, collections, and multi-tenant SaaS — built for Kenyan Digital Credit Providers.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Digital Lending OS — Multi-Tenant SaaS for Kenyan Digital Credit Providers',
    description: 'CBK-compliant lending, M-Pesa integration, automated credit scoring, collections, and multi-tenant SaaS — built for Kenyan Digital Credit Providers.',
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
