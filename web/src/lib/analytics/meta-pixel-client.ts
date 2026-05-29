"use client";

import { getMetaPixelId } from "@/lib/analytics/meta-pixel";

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
  fbq("track", "PageView");
}

export function trackMetaInitiateCheckout(): void {
  fbq("track", "InitiateCheckout");
}

/** Fire InitiateCheckout, then navigate to checkout / upgrade endpoint. */
export function beginCheckoutNavigation(href: string): void {
  if (!getMetaPixelId()) return;
  trackMetaInitiateCheckout();
  window.location.assign(href);
}
