import { cookies, headers } from "next/headers";
import type { BootstrapConfig } from "posthog-js";
import { PostHog } from "posthog-node";

import {
  getPostHogApiHost,
  getPostHogPublicKey,
  getPostHogServerKey,
  isPostHogServerConfigured,
  LANDING_HERO_HEADLINE_FLAG,
  POSTHOG_DISTINCT_ID_HEADER,
} from "@/lib/analytics/posthog-config";
import {
  POSTHOG_DISTINCT_ID_COOKIE,
  readPostHogDistinctIdCookie,
} from "@/lib/analytics/posthog-distinct-id";

let posthogServerClient: PostHog | null = null;

export function getPostHogServerClient(): PostHog | null {
  if (!isPostHogServerConfigured()) return null;

  const apiKey = getPostHogServerKey() ?? getPostHogPublicKey();
  if (!apiKey) return null;

  if (!posthogServerClient) {
    posthogServerClient = new PostHog(apiKey, {
      host: getPostHogApiHost(),
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogServerClient;
}

/** Serverless requests must flush or `$feature_flag_called` never reaches PostHog. */
async function flushPostHogServerEvents(): Promise<void> {
  const client = getPostHogServerClient();
  if (!client) return;
  try {
    await client.flush();
  } catch {
    // Non-blocking — headline still renders from cached evaluation.
  }
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

export async function getPostHogBootstrap(): Promise<BootstrapConfig | undefined> {
  const client = getPostHogServerClient();
  const distinctId = await getPostHogDistinctId();
  if (!client || !distinctId) return undefined;

  try {
    const flagValue = await client.getFeatureFlag(LANDING_HERO_HEADLINE_FLAG, distinctId);
    await flushPostHogServerEvents();
    return {
      distinctID: distinctId,
      featureFlags: {
        [LANDING_HERO_HEADLINE_FLAG]: flagValue ?? "control",
      },
    };
  } catch {
    return { distinctID: distinctId };
  }
}

export type LandingHeroHeadlineVariant = "control" | "test";

/** PostHog multivariate keys that map to the alternate hero (e.g. `test` or `variant-b`). */
const LANDING_HERO_TEST_VARIANTS = new Set(["test", "variant-b"]);

export async function getLandingHeroHeadlineVariant(): Promise<LandingHeroHeadlineVariant> {
  const client = getPostHogServerClient();
  const distinctId = await getPostHogDistinctId();
  if (!client || !distinctId) return "control";

  try {
    const value = await client.getFeatureFlag(LANDING_HERO_HEADLINE_FLAG, distinctId);
    await flushPostHogServerEvents();
    if (value === true || (typeof value === "string" && LANDING_HERO_TEST_VARIANTS.has(value))) {
      return "test";
    }
    return "control";
  } catch {
    return "control";
  }
}

export async function shutdownPostHogServer(): Promise<void> {
  if (!posthogServerClient) return;
  await posthogServerClient.shutdown();
  posthogServerClient = null;
}
