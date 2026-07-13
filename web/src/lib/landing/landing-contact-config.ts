import type { LandingCopy } from "@/lib/i18n/landing/types";

const DEFAULT_CONTACT_HREF = "mailto:hello@spy-rival.com?subject=Enterprise%20pricing";
const DEFAULT_CONTACT_CTA = "Contact us";

export function getLandingContactHref(copy: LandingCopy): string {
  const enterprise = copy.pricing.plans.find((plan) => plan.slug === "enterprise");
  return enterprise?.contactHref ?? DEFAULT_CONTACT_HREF;
}

export function getLandingContactCta(copy: LandingCopy): string {
  const enterprise = copy.pricing.plans.find((plan) => plan.slug === "enterprise");
  return enterprise?.contactCta ?? DEFAULT_CONTACT_CTA;
}
