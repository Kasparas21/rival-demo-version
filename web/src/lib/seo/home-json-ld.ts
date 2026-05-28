import { landingFaqItems } from "@/lib/seo/faq-items";
import { DEFAULT_DESCRIPTION, SITE_URL } from "@/lib/seo/site";

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

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Spy Rival",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI competitor ad intelligence across Meta, Google, TikTok, LinkedIn, Pinterest, Snapchat.",
    offers: [
      {
        "@type": "Offer",
        name: "Starter",
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
        name: "Pro",
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

export function faqPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: landingFaqItems.map((item) => ({
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
export function homePageJsonLdBlocks() {
  return [organizationJsonLd(), softwareApplicationJsonLd(), faqPageJsonLd()];
}

export { DEFAULT_DESCRIPTION };
