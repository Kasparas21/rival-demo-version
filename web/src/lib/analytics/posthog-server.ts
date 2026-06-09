import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { BootstrapConfig } from "posthog-js";
import { PostHog } from "posthog-node";

import {
  getPostHogApiHost,
  getPostHogPublicKey,
  getPostHogServerKey,
  isPostHogServerConfigured,
  LANDING_HERO_HEADLINE_FLAG,
  LANDING_HERO_TEST_VARIANT_KEYS,
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

/** Fresh client + shutdown per request — reliable on Vercel serverless. */
async function withPostHogServer<T>(
  fn: (client: PostHog, distinctId: string) => Promise<T>,
): Promise<T | null> {
  const distinctId = await getPostHogDistinctId();
  const client = createPostHogServerClient();
  if (!client || !distinctId) return null;

  try {
    return await fn(client, distinctId);
  } finally {
    try {
      await client.shutdown();
    } catch {
      // Best-effort flush before the lambda exits.
    }
  }
}

export function getPostHogServerClient(): PostHog | null {
  return createPostHogServerClient();
}

export async function getPostHogDistinctId(): Promise<string | null> {
  const headerStore = await headers();
  const fromHeader = readPostHogDistinctIdCookie(
    headerStore.get(POSTHOG_DISTINCT_ID_HEADER),
  );
  if (fromHeader) return fromHeader;

  const cookieStore = await cookies();
  return readPostHogDistinctIdCookie(cookieStore.get(POSTHOG_DISTINCT_ID_COOKIE)?.value) ?? null;
}

export type LandingHeroHeadlineVariant = "control" | "test";

const LANDING_HERO_TEST_VARIANTS = new Set<string>(LANDING_HERO_TEST_VARIANT_KEYS);

function heroVariantFromFlag(value: string | boolean | undefined): LandingHeroHeadlineVariant {
  if (value === true || (typeof value === "string" && LANDING_HERO_TEST_VARIANTS.has(value))) {
    return "test";
  }
  return "control";
}

type PostHogLandingData = {
  bootstrap: BootstrapConfig | undefined;
  heroVariant: LandingHeroHeadlineVariant;
};

/** One PostHog round-trip per request — shared by layout bootstrap + page hero variant. */
export const getPostHogLandingData = cache(async (): Promise<PostHogLandingData> => {
  const result = await withPostHogServer(async (client, distinctId) => {
    const flagValue = await client.getFeatureFlag(LANDING_HERO_HEADLINE_FLAG, distinctId);
    return {
      bootstrap: {
        distinctID: distinctId,
        featureFlags: {
          [LANDING_HERO_HEADLINE_FLAG]: flagValue ?? "control",
        },
      } satisfies BootstrapConfig,
      heroVariant: heroVariantFromFlag(flagValue),
    };
  });

  return result ?? { bootstrap: undefined, heroVariant: "control" };
});

export async function getPostHogBootstrap(): Promise<BootstrapConfig | undefined> {
  return (await getPostHogLandingData()).bootstrap;
}

export async function getLandingHeroHeadlineVariant(): Promise<LandingHeroHeadlineVariant> {
  return (await getPostHogLandingData()).heroVariant;
}

export async function shutdownPostHogServer(): Promise<void> {
  // No-op: clients are shut down per request in withPostHogServer.
}
