import type { LandingCopy } from "@/lib/i18n/landing/types";
import { SITE_URL } from "@/lib/seo/site";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Spy Rival",
    url: SITE_URL,
    logo: `${SITE_URL}/rival-logo.svg`,
    email: "hello@spy-rival.com",
    sameAs: [],
  };
}

export function softwareApplicationJsonLd(copy: LandingCopy) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Spy Rival",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: copy.jsonLd.appDescription,
    offers: [
      {
        "@type": "Offer",
        name: copy.jsonLd.starterName,
        price: "79",
        priceCurrency: "EUR",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "79",
          priceCurrency: "EUR",
          billingIncrement: 1,
          unitText: "MONTH",
        },
      },
      {
        "@type": "Offer",
        name: copy.jsonLd.proName,
        price: "149",
        priceCurrency: "EUR",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "149",
          priceCurrency: "EUR",
          billingIncrement: 1,
          unitText: "MONTH",
        },
      },
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

/** Organization + SoftwareApplication + FAQPage blocks for the homepage. */
export function homePageJsonLdBlocks(copy: LandingCopy) {
  return [organizationJsonLd(), softwareApplicationJsonLd(copy), faqPageJsonLd(copy)];
}
