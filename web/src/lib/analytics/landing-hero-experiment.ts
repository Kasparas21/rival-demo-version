import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { LandingHeroHeadlineVariant } from "@/lib/analytics/posthog-server";

/** Alternate hero copy for PostHog experiment variant `test`. */
export const LANDING_HERO_TEST_HEADLINE: LandingCopy["hero"]["headline"] = {
  line1Prefix: "know ",
  highlight: "what rivals",
  line2: "test before you do.",
  subline: "six platforms, one weekly action plan",
};

export function getLandingHeroTestHeadline(): LandingCopy["hero"]["headline"] {
  return LANDING_HERO_TEST_HEADLINE;
}

export function isLandingHeroTestVariant(flag: string | boolean | undefined | null): boolean {
  return flag === true || flag === "test" || flag === "variant-b";
}

export function applyLandingHeroHeadlineExperiment(
  headline: LandingCopy["hero"]["headline"],
  variant: LandingHeroHeadlineVariant,
  _locale: string,
): LandingCopy["hero"]["headline"] {
  if (variant !== "test") return headline;
  // Experiment copy is EN-only for now; still show it when assigned test on de/nl.
  return LANDING_HERO_TEST_HEADLINE;
}
