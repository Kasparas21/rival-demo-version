import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FEATURE_DEFINITIONS } from "@/components/marketing/features-page-data";
import { MarketingInteractivePage } from "@/components/marketing/marketing-interactive-page";
import {
  MarketingProductDemo,
  type MarketingFeatureDemoId,
} from "@/components/marketing/marketing-product-demo";
import { FEATURE_SLUGS } from "@/lib/marketing/site-nav";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getLandingCopy } from "@/lib/i18n/landing";

type Props = { params: Promise<{ slug: string }> };

function getFeature(slug: string) {
  return FEATURE_DEFINITIONS.find((f) => f.id === slug);
}

function isFeatureDemoId(slug: string): slug is MarketingFeatureDemoId {
  return FEATURE_SLUGS.includes(slug);
}

export function generateStaticParams() {
  return FEATURE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) return { title: "Feature not found" };

  const path = `/features/${slug}`;
  const description = `${feature.summary} ${feature.why}`;

  return {
    title: `${feature.name} | Rival`,
    description,
    alternates: { canonical: path },
    openGraph: { url: path, title: `${feature.name} | Rival`, description },
  };
}

export default async function FeatureDetailPage({ params }: Props) {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature || !isFeatureDemoId(slug)) notFound();

  const locale = await getRequestLocale();
  const copy = getLandingCopy(locale);

  return (
    <MarketingInteractivePage
      copy={copy}
      locale={locale}
      wallOnMount
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Features", href: "/features" },
        { label: feature.name },
      ]}
      title={feature.name.toLowerCase()}
      description={feature.summary}
      demo={<MarketingProductDemo mode="feature" featureId={slug} />}
    />
  );
}
