/** PostHog EU ingest (use `/ingest` in the browser via Next rewrites). */
export const POSTHOG_EU_API_HOST = "https://eu.i.posthog.com";

/** First-party proxy path — see `next.config.ts` rewrites. */
export const POSTHOG_BROWSER_API_HOST = "/ingest";

export const POSTHOG_DISTINCT_ID_COOKIE = "rival_ph_distinct_id";

/** Feature flag / experiment key — create in PostHog → Feature flags → link to an experiment. */
export const LANDING_HERO_HEADLINE_FLAG = "landing-hero-headline";

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
