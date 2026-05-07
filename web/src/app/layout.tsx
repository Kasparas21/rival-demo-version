import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";

const siteUrl = "https://spy-rival.com";
const siteDescription =
  "Spy Rival is an AI ad intelligence platform for finding competitor ads, tracking creative strategy, and mapping full-funnel campaigns across major ad libraries.";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Spy Rival | AI Competitor Ad Intelligence",
    template: "%s | Spy Rival",
  },
  description: siteDescription,
  applicationName: "Spy Rival",
  keywords: [
    "ad spy tool",
    "competitor ad intelligence",
    "AI ad research",
    "Meta ads library",
    "TikTok ads library",
    "Google ads transparency",
    "competitor research",
  ],
  authors: [{ name: "Spy Rival", url: siteUrl }],
  creator: "Spy Rival",
  publisher: "Spy Rival",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Spy Rival",
    title: "Spy Rival | AI Competitor Ad Intelligence",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "Spy Rival | AI Competitor Ad Intelligence",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.svg",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${instrumentSerif.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
