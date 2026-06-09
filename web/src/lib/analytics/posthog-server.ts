import { cookies, headers } from "next/headers";
import type { BootstrapConfig } from "posthog-js";
import { PostHog } from "posthog-node";

import {
  getLandingHeroVariantFromDistinctId,
  getPostHogFlagValueForHeroVariant,
  parseLandingHeroVariantCookie,
  type LandingHeroHeadlineVariant,
} from "@/lib/analytics/landing-hero-bucket";
import {
  getPostHogApiHost,
  getPostHogPublicKey,
  getPostHogServerKey,
  isPostHogServerConfigured,
  LANDING_HERO_HEADLINE_FLAG,
  LANDING_HERO_VARIANT_COOKIE,
  LANDING_HERO_VARIANT_HEADER,
  POSTHOG_DISTINCT_ID_HEADER,
} from "@/lib/analytics/posthog-config";
import {
  POSTHOG_DISTINCT_ID_COOKIE,
  readPostHogDistinctIdCookie,
} from "@/lib/analytics/posthog-distinct-id";

function createPostHogServerClient(): PostHog | null {
  if (!isPostHogServerConfigured()) return null;

  const apiKey = getPostHogServerKey() ?? getPostHogPublicKey();
  if (!apiKey) return null;

  return new PostHog(apiKey, {
    host: getPostHogApiHost(),
    flushAt: 1,
    flushInterval: 0,
  });
}

export function getPostHogServerClient(): PostHog | null {
  return createPostHogServerClient();
}

export async function shutdownPostHogServer(): Promise<void> {
  // No-op: API routes create short-lived clients per call.
}

export type { LandingHeroHeadlineVariant };

export async function getPostHogDistinctId(): Promise<string | null> {
  const headerStore = await headers();
  const fromHeader = readPostHogDistinctIdCookie(
    headerStore.get(POSTHOG_DISTINCT_ID_HEADER),
  );
  if (fromHeader) return fromHeader;

  const cookieStore = await cookies();
  return readPostHogDistinctIdCookie(cookieStore.get(POSTHOG_DISTINCT_ID_COOKIE)?.value) ?? null;
}

async function getLandingHeroVariantFromRequest(): Promise<LandingHeroHeadlineVariant> {
  const headerStore = await headers();
  const fromHeader = parseLandingHeroVariantCookie(headerStore.get(LANDING_HERO_VARIANT_HEADER));
  if (fromHeader) return fromHeader;

  const cookieStore = await cookies();
  const fromCookie = parseLandingHeroVariantCookie(
    cookieStore.get(LANDING_HERO_VARIANT_COOKIE)?.value,
  );
  if (fromCookie) return fromCookie;

  const distinctId = await getPostHogDistinctId();
  if (distinctId) return getLandingHeroVariantFromDistinctId(distinctId);

  return "control";
}

/** Client bootstrap from edge-assigned variant — no PostHog API round-trip on SSR. */
export async function getPostHogBootstrap(): Promise<BootstrapConfig | undefined> {
  const distinctId = await getPostHogDistinctId();
  if (!distinctId) return undefined;

  const heroVariant = await getLandingHeroVariantFromRequest();

  return {
    distinctID: distinctId,
    featureFlags: {
      [LANDING_HERO_HEADLINE_FLAG]: getPostHogFlagValueForHeroVariant(heroVariant),
    },
  };
}

export async function getLandingHeroHeadlineVariant(): Promise<LandingHeroHeadlineVariant> {
  return getLandingHeroVariantFromRequest();
}
