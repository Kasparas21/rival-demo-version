import { LANDING_HERO_TEST_VARIANT_KEYS } from "@/lib/analytics/posthog-config";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { LandingHeroHeadlineVariant } from "@/lib/analytics/posthog-server";

const LANDING_HERO_TEST_VARIANT_SET = new Set<string>(LANDING_HERO_TEST_VARIANT_KEYS);

/** Alternate hero copy for PostHog experiment variant `test`. */
export const LANDING_HERO_TEST_HEADLINE: LandingCopy["hero"]["headline"] = {
  line1Prefix: "the ",
  highlight: "ultimate ad spy tool",
  line2: "",
  subline:
    "See every ad your competitors run across Meta, Google, TikTok, LinkedIn, Pinterest & Snapchat - in one dashboard.",
};

export function getLandingHeroTestHeadline(): LandingCopy["hero"]["headline"] {
  return LANDING_HERO_TEST_HEADLINE;
}

export function isLandingHeroTestVariant(flag: string | boolean | undefined | null): boolean {
  return flag === true || (typeof flag === "string" && LANDING_HERO_TEST_VARIANT_SET.has(flag));
}

/** Dev-only: force hero variant via `?hero=control` or `?hero=variant` on localhost. */
export function parseDevHeroVariantPreview(
  heroParam: string | null | undefined,
): LandingHeroHeadlineVariant | null {
  if (process.env.NODE_ENV !== "development" || !heroParam?.trim()) return null;

  const normalized = heroParam.trim().toLowerCase();
  if (normalized === "control") return "control";
  if (
    normalized === "variant" ||
    normalized === "test" ||
    normalized === "example-variant" ||
    normalized === "example_variant"
  ) {
    return "test";
  }

  return null;
}

export function isDevHeroVariantPreviewActive(heroParam: string | null | undefined): boolean {
  return parseDevHeroVariantPreview(heroParam) !== null;
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
