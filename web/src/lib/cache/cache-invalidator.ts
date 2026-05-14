import { ADS_LIBRARY_UPDATED_EVENT } from "@/lib/strategy-overview/ads-library-strategy-bridge";

import { SESSION_PREFIX } from "./use-scrape-keyed-cache";

/** Deletes session entries written as `rival:cache:<domain>:…`. */
export function invalidateCachesForDomain(domain: string): void {
  if (typeof window === "undefined") return;
  const normalized = domain.trim().toLowerCase();
  if (!normalized) return;
  const prefix = `${SESSION_PREFIX}${normalized}:`;
  const keysToDelete: string[] = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (!k?.startsWith(SESSION_PREFIX)) continue;
    if (k.startsWith(prefix) || k.toLowerCase().includes(`:${normalized}:`)) {
      keysToDelete.push(k);
    }
  }

  keysToDelete.forEach((k) => sessionStorage.removeItem(k));

  if (process.env.NODE_ENV === "development" && keysToDelete.length) {
    console.log(`[scrape-cache] INVALIDATED ${keysToDelete.length} entries for "${domain}"`);
  }
}

/** Clear keys whose logical key (after prefix) starts with `prefix` (e.g. `brand.com:saved-ads:uuid`). */
export function invalidateCachesByPrefix(prefix: string): void {
  if (typeof window === "undefined") return;
  const fullPrefix = SESSION_PREFIX + prefix;
  const keysToDelete: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (!k?.startsWith(fullPrefix)) continue;
    keysToDelete.push(k);
  }
  keysToDelete.forEach((k) => sessionStorage.removeItem(k));
}

/** Any GET cache row for this competitor’s saved-ads list (all revision suffixes). */
export function invalidateSavedAdsCaches(domainNorm: string, competitorId: string): void {
  if (typeof window === "undefined") return;
  const id = competitorId.trim().toLowerCase();
  if (!id) return;
  const dom = domainNorm.trim().toLowerCase();
  const needle = `${dom}:saved-ads:${id}`.toLowerCase();
  const keysToDelete: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (!k?.startsWith(SESSION_PREFIX)) continue;
    if (k.toLowerCase().includes(needle)) keysToDelete.push(k);
  }
  keysToDelete.forEach((k) => sessionStorage.removeItem(k));
}

export function setupGlobalCacheInvalidator(): () => void {
  if (typeof window === "undefined") return () => {};
  const handler: EventListener = (ev) => {
    const detail = (ev as CustomEvent<{ domain?: string }>).detail;
    const d = detail?.domain?.trim();
    if (!d) return;
    invalidateCachesForDomain(d);
  };
  window.addEventListener(ADS_LIBRARY_UPDATED_EVENT, handler);
  return () => window.removeEventListener(ADS_LIBRARY_UPDATED_EVENT, handler);
}
