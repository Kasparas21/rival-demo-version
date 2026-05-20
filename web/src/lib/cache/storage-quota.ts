/**
 * localStorage helpers — feature caches must never block sidebar / account writes.
 */

const RIVAL_CACHE_PREFIX = "rival:cache:";
const ADS_LIBRARY_LOCAL_PREFIX = "ads-library:persistent:";

/** Only small payloads are mirrored to localStorage; large ones stay in sessionStorage. */
export const MAX_LOCAL_MIRROR_BYTES = 256 * 1024;

export function isQuotaExceededError(err: unknown): boolean {
  if (err instanceof DOMException && (err.name === "QuotaExceededError" || err.code === 22)) {
    return true;
  }
  return err instanceof Error && /quota/i.test(err.message);
}

/** Drop bulky feature-cache rows from localStorage (sessionStorage keeps same-tab instant loads). */
export function evictBulkyLocalStorageCaches(): number {
  if (typeof window === "undefined") return 0;
  let removed = 0;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k) continue;
    if (k.startsWith(RIVAL_CACHE_PREFIX) || k.startsWith(ADS_LIBRARY_LOCAL_PREFIX)) {
      keys.push(k);
    }
  }
  keys.forEach((k) => {
    window.localStorage.removeItem(k);
    removed += 1;
  });
  if (process.env.NODE_ENV === "development" && removed > 0) {
    console.warn(`[storage] evicted ${removed} bulky localStorage cache entries`);
  }
  return removed;
}

/**
 * Write to localStorage; on quota error evict feature caches and retry once.
 * Returns false if the value still cannot be stored (caller should not throw).
 */
export function safeSetLocalStorage(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (!isQuotaExceededError(err)) throw err;
    evictBulkyLocalStorageCaches();
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      if (!isQuotaExceededError(retryErr)) throw retryErr;
      if (process.env.NODE_ENV === "development") {
        console.warn(`[storage] could not persist "${key}" (${value.length} bytes) after eviction`);
      }
      return false;
    }
  }
}

export function safeSetSessionStorage(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (!isQuotaExceededError(err)) throw err;
    evictBulkyLocalStorageCaches();
    try {
      window.sessionStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      if (!isQuotaExceededError(retryErr)) throw retryErr;
      return false;
    }
  }
}

/** Mirror to localStorage only when small enough to leave room for sidebar + account keys. */
export function mirrorToLocalStorageIfSmall(fullKey: string, serialized: string): void {
  if (serialized.length > MAX_LOCAL_MIRROR_BYTES) return;
  safeSetLocalStorage(fullKey, serialized);
}
