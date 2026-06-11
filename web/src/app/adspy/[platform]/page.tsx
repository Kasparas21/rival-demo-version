import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketingInteractivePage } from "@/components/marketing/marketing-interactive-page";
import { MarketingProductDemo } from "@/components/marketing/marketing-product-demo";
import { ADSPY_SLUG_TO_DEMO_PLATFORM } from "@/lib/marketing/adspy-platform-map";
import { ADSPY_PAGE_DEFINITIONS, getAdspyPage } from "@/lib/marketing/adspy-pages";
import { ADSPY_PLATFORM_SLUGS } from "@/lib/marketing/site-nav";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getLandingCopy } from "@/lib/i18n/landing";

type Props = { params: Promise<{ platform: string }> };

export function generateStaticParams() {
  return ADSPY_PLATFORM_SLUGS.map((platform) => ({ platform }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { platform } = await params;
  const page = getAdspyPage(platform);
  if (!page) return { title: "AdSpy page not found" };

  const path = `/adspy/${platform}`;

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: path },
    openGraph: { url: path, title: page.metaTitle, description: page.metaDescription },
  };
}

export default async function AdspyPlatformPage({ params }: Props) {
  const { platform } = await params;
  const page = getAdspyPage(platform);
  const demoPlatform = ADSPY_SLUG_TO_DEMO_PLATFORM[platform as keyof typeof ADSPY_SLUG_TO_DEMO_PLATFORM];
  if (!page || !demoPlatform) notFound();

  const locale = await getRequestLocale();
  const copy = getLandingCopy(locale);

  return (
    <MarketingInteractivePage
      copy={copy}
      locale={locale}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "AdSpy", href: `/adspy/${ADSPY_PAGE_DEFINITIONS[0]?.slug ?? "meta"}` },
        { label: page.name },
      ]}
      title={page.headline.toLowerCase()}
      description={page.summary}
      demo={<MarketingProductDemo mode="adspy" lockedPlatform={demoPlatform} />}
    />
  );
}
