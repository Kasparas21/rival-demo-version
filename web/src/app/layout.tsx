import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { Suspense } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DeferredMarketingTags } from "@/components/analytics/deferred-marketing-tags";
import { MetaPixelPageView } from "@/components/analytics/meta-pixel-page-view";
import { SitePostHogProvider } from "@/components/analytics/posthog-provider";
import { getPostHogBootstrap } from "@/lib/analytics/posthog-server";
import { fontInter } from "@/lib/fonts/inter";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
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
    default: `${SITE_NAME} - #1 Free Adspy Tool`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "adspy",
    "adspy tool",
    "free adspy tool",
    "#1 adspy tool",
    "competitor ad intelligence",
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
    title: `${SITE_NAME} - #1 Free Adspy Tool`,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — #1 Free Adspy Tool`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - #1 Free Adspy Tool`,
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
  const posthogBootstrap = await getPostHogBootstrap();

  return (
    <html lang={lang}>
      <body
        className={`${instrumentSerif.variable} ${fontInter.variable} ${fontInter.className} font-sans antialiased`}
      >
        <DeferredMarketingTags />
        <SitePostHogProvider bootstrap={posthogBootstrap}>
          <Suspense fallback={null}>
            <MetaPixelPageView />
          </Suspense>
          {children}
        </SitePostHogProvider>
        {process.env.NODE_ENV === "production" ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
