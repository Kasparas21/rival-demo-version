import type { LandingCopy } from "@/lib/i18n/landing/types";
import { schemaOfferJsonLd, SCHEMA_PLAN_PRICING_USD } from "@/lib/seo/schema-pricing";
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
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SCHEMA_BRAND_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: copy.jsonLd.appDescription,
    offers: [
      schemaOfferJsonLd(copy.jsonLd.starterName, SCHEMA_PLAN_PRICING_USD.starter),
      schemaOfferJsonLd(copy.jsonLd.proName, SCHEMA_PLAN_PRICING_USD.pro),
    ],
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
