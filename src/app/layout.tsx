import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";

// Self-hosted variable fonts (no third-party requests). next/font preloads them and
// generates a size-adjusted fallback so the swap does not shift the layout.
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
const grotesk = localFont({
  src: "./fonts/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-grotesk",
  weight: "300 700",
  display: "swap",
});

const TITLE = "MS Growth Engine by iSN Business Solutions | Automated sales system for Mystery Shopping companies";
const DESCRIPTION =
  "From first click to booked call, automatically. MS Growth Engine connects marketing, AI engagement, qualification, and CRM into one automated sales flow built for Mystery Shopping companies.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3109"),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "MS Growth Engine",
  authors: [{ name: "iSN Business Solutions", url: "https://www.isngs.com/" }],
  keywords: [
    "Mystery Shopping",
    "sales automation",
    "AI sales assistant",
    "lead generation",
    "CRM",
    "iSN Business Solutions",
  ],
  openGraph: {
    title: "MS Growth Engine by iSN Business Solutions",
    description: "From First Click to Booked Call. Automatically.",
    type: "website",
    siteName: "MS Growth Engine",
  },
  twitter: {
    card: "summary_large_image",
    title: "MS Growth Engine by iSN Business Solutions",
    description: "From First Click to Booked Call. Automatically.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1a120d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="min-h-screen font-sans text-text antialiased">
        <noscript>
          <style>{`.rw{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
        {children}
        {/* iSN chat assistant widget (third-party embed supplied by iSN) */}
        <Script
          src="https://chat.isngs.com/widget.js"
          data-client-key="pk_0pRX6-6LINmQZKAAncC_s1J8tK_E7YQz"
          data-api-base="https://159-89-230-107.nip.io"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
