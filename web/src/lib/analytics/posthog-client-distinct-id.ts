import { POSTHOG_DISTINCT_ID_COOKIE, readPostHogDistinctIdCookie } from "@/lib/analytics/posthog-distinct-id";

/** Read the first-party experiment id set by middleware (same id as server-side flags). */
export function readClientPostHogDistinctId(): string | undefined {
  if (typeof document === "undefined") return undefined;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${POSTHOG_DISTINCT_ID_COOKIE}=([^;]*)`),
  );
  if (!match?.[1]) return undefined;

  try {
    return readPostHogDistinctIdCookie(decodeURIComponent(match[1]));
  } catch {
    return readPostHogDistinctIdCookie(match[1]);
  }
}
