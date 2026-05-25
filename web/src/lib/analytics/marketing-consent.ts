export const MARKETING_CONSENT_STORAGE_KEY = "rival_marketing_consent";
export const MARKETING_CONSENT_EVENT = "rival:marketing-consent";

export type MarketingConsentStatus = "granted" | "denied";

export function readStoredMarketingConsent(): MarketingConsentStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(MARKETING_CONSENT_STORAGE_KEY)?.trim();
    if (value === "granted" || value === "denied") return value;
  } catch {
    /* localStorage may be blocked */
  }
  return null;
}

export function hasMarketingConsent(): boolean {
  return readStoredMarketingConsent() === "granted";
}

export function writeMarketingConsent(granted: boolean): MarketingConsentStatus {
  const status: MarketingConsentStatus = granted ? "granted" : "denied";
  try {
    window.localStorage.setItem(MARKETING_CONSENT_STORAGE_KEY, status);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(MARKETING_CONSENT_EVENT, { detail: { status } }),
    );
  }
  return status;
}
