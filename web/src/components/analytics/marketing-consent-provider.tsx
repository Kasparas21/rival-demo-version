"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  MARKETING_CONSENT_EVENT,
  readStoredMarketingConsent,
  writeMarketingConsent,
  type MarketingConsentStatus,
} from "@/lib/analytics/marketing-consent";

type MarketingConsentContextValue = {
  /** `null` until localStorage is read on the client, or when the user has not chosen yet. */
  status: MarketingConsentStatus | null;
  /** False until the stored consent choice has been read (avoids banner flash on refresh). */
  isResolved: boolean;
  acceptMarketing: () => void;
  rejectMarketing: () => void;
};

const MarketingConsentContext = createContext<MarketingConsentContextValue | null>(null);

function readInitialConsent(): {
  status: MarketingConsentStatus | null;
  isResolved: boolean;
} {
  if (typeof window === "undefined") {
    return { status: null, isResolved: false };
  }
  return { status: readStoredMarketingConsent(), isResolved: true };
}

export function MarketingConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<MarketingConsentStatus | null>(
    () => readInitialConsent().status,
  );
  const [isResolved] = useState(() => readInitialConsent().isResolved);

  useEffect(() => {
    const onConsentChange = (event: Event) => {
      const detail = (event as CustomEvent<{ status: MarketingConsentStatus }>).detail;
      if (detail?.status === "granted" || detail?.status === "denied") {
        setStatus(detail.status);
      }
    };

    window.addEventListener(MARKETING_CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(MARKETING_CONSENT_EVENT, onConsentChange);
  }, []);

  const acceptMarketing = useCallback(() => {
    setStatus(writeMarketingConsent(true));
  }, []);

  const rejectMarketing = useCallback(() => {
    setStatus(writeMarketingConsent(false));
  }, []);

  const value = useMemo(
    () => ({ status, isResolved, acceptMarketing, rejectMarketing }),
    [status, isResolved, acceptMarketing, rejectMarketing],
  );

  return (
    <MarketingConsentContext.Provider value={value}>{children}</MarketingConsentContext.Provider>
  );
}

export function useMarketingConsent(): MarketingConsentContextValue {
  const context = useContext(MarketingConsentContext);
  if (!context) {
    throw new Error("useMarketingConsent must be used within MarketingConsentProvider");
  }
  return context;
}

/** Safe for optional consent reads outside the provider tree. */
export function useOptionalMarketingConsent(): MarketingConsentContextValue | null {
  return useContext(MarketingConsentContext);
}
