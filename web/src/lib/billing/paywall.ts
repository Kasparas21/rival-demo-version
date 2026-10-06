import { safeNextPath } from "@/lib/auth/safe-next-path";

/** Plan picker shown after onboarding to anyone without an active plan (admins and comped accounts skip it). */
export const PAYWALL_PATH = "/choose-plan";

/** `/choose-plan`, preserving where to continue after checkout. */
export function buildPaywallHref(next?: string | null): string {
  const safeNext = safeNextPath(next);
  if (!safeNext || safeNext === PAYWALL_PATH) return PAYWALL_PATH;
  return `${PAYWALL_PATH}?next=${encodeURIComponent(safeNext)}`;
}
