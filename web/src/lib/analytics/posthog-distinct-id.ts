import { POSTHOG_DISTINCT_ID_COOKIE } from "@/lib/analytics/posthog-config";

const DISTINCT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidPostHogDistinctId(value: string | undefined | null): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length > 64) return false;
  return DISTINCT_ID_PATTERN.test(trimmed) || /^[a-zA-Z0-9_-]{8,64}$/.test(trimmed);
}

export function readPostHogDistinctIdCookie(
  cookieValue: string | undefined | null,
): string | undefined {
  if (!isValidPostHogDistinctId(cookieValue)) return undefined;
  return cookieValue.trim();
}

export { POSTHOG_DISTINCT_ID_COOKIE };
