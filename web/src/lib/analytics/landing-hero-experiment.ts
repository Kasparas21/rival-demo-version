import { LANDING_HERO_TEST_VARIANT_KEYS } from "@/lib/analytics/posthog-config";
import type { LandingCopy } from "@/lib/i18n/landing/types";
import type { LandingHeroHeadlineVariant } from "@/lib/analytics/posthog-server";

const LANDING_HERO_TEST_VARIANT_SET = new Set<string>(LANDING_HERO_TEST_VARIANT_KEYS);

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
  hero: Pick<LandingCopy["hero"], "headline" | "testHeadline">,
  variant: LandingHeroHeadlineVariant,
): LandingCopy["hero"]["headline"] {
  if (variant !== "test") return hero.headline;
  return hero.testHeadline;
}
