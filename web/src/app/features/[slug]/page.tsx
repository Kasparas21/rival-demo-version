import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FeatureDetail } from "@/components/landing/marketing-pages";
import { FEATURE_DEFINITIONS } from "@/components/marketing/features-page-data";
import { EditorialShell } from "@/components/marketing/editorial-shell";
import { FEATURE_SLUGS } from "@/lib/marketing/site-nav";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getLandingCopy } from "@/lib/i18n/landing";

type Props = { params: Promise<{ slug: string }> };

function getFeature(slug: string) {
  return FEATURE_DEFINITIONS.find((f) => f.id === slug);
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
  if (!feature) notFound();

  const locale = await getRequestLocale();
  const copy = getLandingCopy(locale);

  return (
    <EditorialShell copy={copy} locale={locale}>
      <FeatureDetail copy={copy} locale={locale} featureId={feature.id} />
    </EditorialShell>
  );
}
