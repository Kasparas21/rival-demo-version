/** PostHog EU ingest (use `/ingest` in the browser via Next rewrites). */
export const POSTHOG_EU_API_HOST = "https://eu.i.posthog.com";

/** First-party proxy path — see `next.config.ts` rewrites. */
export const POSTHOG_BROWSER_API_HOST = "/ingest";

export const POSTHOG_DISTINCT_ID_COOKIE = "rival_ph_distinct_id";

/** Set in middleware so the same request can evaluate flags before the cookie round-trips. */
export const POSTHOG_DISTINCT_ID_HEADER = "x-rival-ph-distinct-id";

/** Edge-assigned hero A/B arm — avoids blocking SSR on PostHog API. */
export const LANDING_HERO_VARIANT_COOKIE = "rival_hero_variant";
export const LANDING_HERO_VARIANT_HEADER = "x-rival-hero-variant";

/** Feature flag / experiment key — create in PostHog → Feature flags → Experiments. */
export const LANDING_HERO_HEADLINE_FLAG = "landing-page-hero-test-1";

/** Multivariate keys that show the alternate hero headline (control = default copy). */
export const LANDING_HERO_TEST_VARIANT_KEYS = [
  "example-variant",
  "test",
  "variant-b",
] as const;

export function getPostHogPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || undefined;
}

export function getPostHogServerKey(): string | undefined {
  return (
    process.env.POSTHOG_API_KEY?.trim() ||
    process.env.POSTHOG_PERSONAL_API_KEY?.trim() ||
    undefined
  );
}

export function isPostHogConfigured(): boolean {
  return Boolean(getPostHogPublicKey());
}

export function isPostHogServerConfigured(): boolean {
  return Boolean(getPostHogServerKey() || getPostHogPublicKey());
}

export function getPostHogApiHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || POSTHOG_EU_API_HOST;
}
