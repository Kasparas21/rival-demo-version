"use client";

import { getMetaPixelId } from "@/lib/analytics/meta-pixel";
import { hasMarketingConsent } from "@/lib/analytics/marketing-consent";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq(...args);
}

export function trackMetaPageView(): void {
  if (!getMetaPixelId() || !hasMarketingConsent()) return;
  fbq("track", "PageView");
}

export function trackMetaInitiateCheckout(): void {
  if (!getMetaPixelId() || !hasMarketingConsent()) return;
  fbq("track", "InitiateCheckout");
}

/** Fire InitiateCheckout, then navigate to checkout / upgrade endpoint. */
export function beginCheckoutNavigation(href: string): void {
  trackMetaInitiateCheckout();
  window.location.assign(href);
}
