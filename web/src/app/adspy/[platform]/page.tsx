import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdspyDetail } from "@/components/landing/marketing-pages";
import { EditorialShell } from "@/components/marketing/editorial-shell";
import { getAdspyPage } from "@/lib/marketing/adspy-pages";
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
  if (!page) notFound();

  const locale = await getRequestLocale();
  const copy = getLandingCopy(locale);

  return (
    <EditorialShell copy={copy} locale={locale}>
      <AdspyDetail copy={copy} locale={locale} slug={page.slug} />
    </EditorialShell>
  );
}
