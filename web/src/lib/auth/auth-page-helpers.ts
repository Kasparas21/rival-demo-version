import { safeNextPath } from "@/lib/auth/safe-next-path";

export type SearchParams = Record<string, string | string[] | undefined>;

export function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Maps post-checkout onboarding continuation to Polar checkout API redirect. */
export function postOnboardingPath(path: string): string {
  return path === "/checkout" ? "/api/billing/checkout" : path;
}

/**
 * Validates `next`-style paths (same-site only, see `safeNextPath`) and
 * excludes the auth page pathname to prevent redirect loops.
 */
export function safeAuthNextPath(value: string | null, exclude: "/login" | "/signup"): string | null {
  const safe = safeNextPath(value);
  return safe && safe !== exclude ? safe : null;
}
