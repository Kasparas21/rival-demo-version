/** Default Meta Pixel ID (SpyRival). Override via env. */
export const DEFAULT_META_PIXEL_ID = "3206222459565978";

/** Public Meta Pixel ID (browser). */
export function getMetaPixelId(): string {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return id || DEFAULT_META_PIXEL_ID;
}

/** Server-side Conversions API pixel ID. */
export function getMetaPixelIdForCapi(): string {
  const id = process.env.META_PIXEL_ID?.trim();
  return id || DEFAULT_META_PIXEL_ID;
}

/** Paths that start checkout or prorated upgrade (InitiateCheckout). */
export function isCheckoutNavigationHref(href: string): boolean {
  const normalized = href.trim();
  if (!normalized) return false;

  let path = normalized;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      path = new URL(normalized).pathname;
    } catch {
      return false;
    }
  } else {
    path = normalized.split("?")[0]?.split("#")[0] ?? "";
  }

  return (
    path === "/checkout" ||
    path === "/api/billing/checkout" ||
    path === "/api/billing/upgrade"
  );
}
