import { FeaturesPage } from "@/components/marketing/features-page";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getLandingCopy } from "@/lib/i18n/landing";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore every Rival feature in depth: multi-platform ad library, strategy map, three moves, stealable angles, and more.",
  alternates: { canonical: "/features" },
  openGraph: {
    url: "/features",
    title: "Features | Rival",
    description:
      "Explore every Rival feature in depth: multi-platform ad library, strategy map, three moves, stealable angles, and more.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Features | Rival",
    images: ["/twitter-image"],
  },
};

export default async function FeaturesRoutePage() {
  const locale = await getRequestLocale();
  const copy = getLandingCopy(locale);

  return <FeaturesPage copy={copy} locale={locale} />;
}
