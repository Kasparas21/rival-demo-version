import type { Metadata } from "next";

import { PricingPage } from "@/components/landing/pricing-page";
import { EditorialShell } from "@/components/marketing/editorial-shell";
import { getRequestLocale } from "@/lib/i18n/get-request-locale";
import { getLandingCopy } from "@/lib/i18n/landing";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = getLandingCopy(locale);
  const title = `${copy.showcase.pricingPage.title} | Rival`;
  const description = copy.pricing.guaranteeBody;
  return {
    title,
    description,
    alternates: { canonical: "/pricing" },
    openGraph: { url: "/pricing", title, description },
  };
}

export default async function Pricing() {
  const locale = await getRequestLocale();
  const copy = getLandingCopy(locale);
  return (
    <EditorialShell copy={copy} locale={locale} promo={false}>
      <PricingPage copy={copy} locale={locale} />
    </EditorialShell>
  );
}
