import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { Suspense } from "react";
import { SiteGoogleAnalytics } from "@/components/analytics/google-analytics";
import { SiteGoogleTagManager } from "@/components/analytics/google-tag-manager";
import { MarketingConsentBanner } from "@/components/analytics/marketing-consent-banner";
import { MarketingConsentProvider } from "@/components/analytics/marketing-consent-provider";
import { SiteMetaPixel } from "@/components/analytics/meta-pixel";
import { MetaPixelPageView } from "@/components/analytics/meta-pixel-page-view";
import { PostHogIdentify } from "@/components/analytics/posthog-identify";
import { PostHogLandingExperimentExposure } from "@/components/analytics/posthog-landing-experiment";
import { SitePostHogProvider } from "@/components/analytics/posthog-provider";
import { getPostHogBootstrap } from "@/lib/analytics/posthog-server";
import { fontInter } from "@/lib/fonts/inter";
import { fontTempting } from "@/lib/fonts/tempting";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getLandingCopy } from "@/lib/i18n/landing";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo/site";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | AI Competitor Ad Intelligence`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "ad spy tool",
    "competitor ad intelligence",
    "AI ad research",
    "Meta ads library",
    "TikTok ads library",
    "Google ads transparency",
    "competitor research",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | AI Competitor Ad Intelligence`,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — AI Competitor Ad Intelligence`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | AI Competitor Ad Intelligence`,
    description: DEFAULT_DESCRIPTION,
    images: ["/twitter-image"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getRequestLocale();
  const consentCopy = getLandingCopy(lang).consent;
  const posthogBootstrap = await getPostHogBootstrap();

  return (
    <html lang={lang}>
      <head>
        <SiteGoogleAnalytics />
        <SiteGoogleTagManager />
        <SiteMetaPixel />
      </head>
      <body
        className={`${instrumentSerif.variable} ${fontInter.variable} ${fontInter.className} ${fontTempting.variable} font-sans antialiased`}
      >
        <MarketingConsentProvider>
          <SitePostHogProvider bootstrap={posthogBootstrap}>
            <PostHogIdentify />
            <PostHogLandingExperimentExposure />
            <Suspense fallback={null}>
              <MetaPixelPageView />
            </Suspense>
            {children}
            <MarketingConsentBanner copy={consentCopy} />
          </SitePostHogProvider>
        </MarketingConsentProvider>
      </body>
    </html>
  );
}
