import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { LandingHeroHeadlineVariant } from "@/lib/analytics/posthog-server";

/** Alternate hero copy for PostHog experiment variant `variant-b` (English-first; other locales fall back to control). */
const HERO_HEADLINE_VARIANT_B_EN: LandingCopy["hero"]["headline"] = {
  line1Prefix: "know ",
  highlight: "what rivals",
  line2: "test before you do.",
  subline: "six platforms, one weekly action plan",
};

export function applyLandingHeroHeadlineExperiment(
  headline: LandingCopy["hero"]["headline"],
  variant: LandingHeroHeadlineVariant,
  _locale: string,
): LandingCopy["hero"]["headline"] {
  if (variant !== "test") return headline;
  // Experiment copy is EN-only for now; still show it when assigned test on de/nl.
  return HERO_HEADLINE_VARIANT_B_EN;
}
