import {
  LANDING_HERO_HEADLINE_FLAG,
  LANDING_HERO_TEST_VARIANT_KEYS,
} from "@/lib/analytics/posthog-config";

export type LandingHeroHeadlineVariant = "control" | "test";

/** FNV-1a — matches PostHog feature-flag bucketing. */
function posthogHash(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic 50/50 bucket from distinct ID (same user always gets the same arm). */
export function getLandingHeroVariantFromDistinctId(distinctId: string): LandingHeroHeadlineVariant {
  const bucket = posthogHash(`${distinctId}${LANDING_HERO_HEADLINE_FLAG}`) % 100;
  return bucket < 50 ? "test" : "control";
}

export function getPostHogFlagValueForHeroVariant(variant: LandingHeroHeadlineVariant): string {
  if (variant === "test") {
    return LANDING_HERO_TEST_VARIANT_KEYS[0];
  }
  return "control";
}

export function parseLandingHeroVariantCookie(
  value: string | null | undefined,
): LandingHeroHeadlineVariant | null {
  if (value === "test" || value === "control") return value;
  return null;
}
