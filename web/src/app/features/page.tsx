import { FeaturesOverview } from "@/components/landing/marketing-pages";
import { EditorialShell } from "@/components/marketing/editorial-shell";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getLandingCopy } from "@/lib/i18n/landing";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore every Rival feature in depth: multi-platform ad library, strategy map, stealable angles, copy vault and more.",
  alternates: { canonical: "/features" },
  openGraph: {
    url: "/features",
    title: "Features | Rival",
    description:
      "Explore every Rival feature in depth: multi-platform ad library, strategy map, stealable angles, copy vault and more.",
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

  return (
    <EditorialShell copy={copy} locale={locale}>
      <FeaturesOverview copy={copy} locale={locale} />
    </EditorialShell>
  );
}
