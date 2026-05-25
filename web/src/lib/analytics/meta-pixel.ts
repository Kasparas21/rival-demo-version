/** Public Meta Pixel ID (browser). */
export function getMetaPixelId(): string | null {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return id || null;
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
