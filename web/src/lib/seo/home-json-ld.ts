import type { LandingCopy } from "@/lib/i18n/landing/types";
import { ONE_PLAN } from "@/lib/billing/one-plan";
import { LANDING_PRICE_CURRENCY } from "@/lib/billing/plan-price-format";
import { ORGANIZATION_SAME_AS, SCHEMA_BRAND_NAME, SITE_URL } from "@/lib/seo/site";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SCHEMA_BRAND_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/rival-logo.svg`,
    email: "hello@spy-rival.com",
    sameAs: [...ORGANIZATION_SAME_AS],
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SCHEMA_BRAND_NAME,
    url: SITE_URL,
    publisher: {
      "@type": "Organization",
      name: SCHEMA_BRAND_NAME,
      url: SITE_URL,
    },
  };
}

export function softwareApplicationJsonLd(copy: LandingCopy) {
  const price = String(ONE_PLAN.monthlyUsd);

  const offers = [
    {
      "@type": "Offer",
      name: copy.pricing.onePlan.badge,
      price,
      priceCurrency: LANDING_PRICE_CURRENCY,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price,
        priceCurrency: LANDING_PRICE_CURRENCY,
        billingIncrement: 1,
        unitText: "MONTH",
      },
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SCHEMA_BRAND_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: copy.jsonLd.appDescription,
    offers,
  };
}

export function faqPageJsonLd(copy: LandingCopy) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: copy.faq.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

/** Organization + WebSite + SoftwareApplication + FAQPage blocks for the homepage. */
export function homePageJsonLdBlocks(copy: LandingCopy) {
  return [organizationJsonLd(), webSiteJsonLd(), softwareApplicationJsonLd(copy), faqPageJsonLd(copy)];
}
