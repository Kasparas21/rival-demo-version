import { cookies, headers } from "next/headers";
import type { BootstrapConfig } from "posthog-js";
import { PostHog } from "posthog-node";

import {
  getPostHogApiHost,
  getPostHogPublicKey,
  getPostHogServerKey,
  isPostHogServerConfigured,
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
  const distinctId = await getPostHogDistinctId();
  if (!distinctId) return undefined;

  return { distinctID: distinctId };
}

export async function shutdownPostHogServer(): Promise<void> {
  // No-op: API routes create short-lived clients per call.
}
