/** Plan picker shown after onboarding to anyone without an active plan (admins and comped accounts skip it). */
export const PAYWALL_PATH = "/choose-plan";

/** Same-origin relative path only: rejects `//host`, backslashes and control characters. */
function safeRelativeNext(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(trimmed)) return null;
  return trimmed;
}

/** `/choose-plan`, preserving where to continue after checkout. */
export function buildPaywallHref(next?: string | null): string {
  const safeNext = safeRelativeNext(next);
  if (!safeNext || safeNext === PAYWALL_PATH) return PAYWALL_PATH;
  return `${PAYWALL_PATH}?next=${encodeURIComponent(safeNext)}`;
}
