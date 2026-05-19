/** Session keys so competitor hydration never re-runs Apify during / right after discovery scan. */

const IN_PROGRESS_PREFIX = "ads-library:discovery-in-progress:";
const FRESH_PREFIX = "ads-library:discovery-fresh:";
/** How long post-scan loads stay cache-only (competitor background hydrate). */
const FRESH_TTL_MS = 30 * 60 * 1000;

function cleanDomain(d: string): string {
  const t = d.trim().toLowerCase();
  return t.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || t;
}

function readJson(key: string): { at: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number };
    if (typeof parsed.at !== "number") return null;
    return { at: parsed.at };
  } catch {
    return null;
  }
}

function writeAt(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ at: Date.now() }));
  } catch {
    /* quota */
  }
}

function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function markDiscoveryScanInProgress(domain: string): void {
  const d = cleanDomain(domain);
  if (!d) return;
  writeAt(`${IN_PROGRESS_PREFIX}${d}`);
}

export function clearDiscoveryScanInProgress(domain: string): void {
  const d = cleanDomain(domain);
  if (!d) return;
  removeKey(`${IN_PROGRESS_PREFIX}${d}`);
}

export function markFreshDiscoveryScan(domain: string): void {
  const d = cleanDomain(domain);
  if (!d) return;
  clearDiscoveryScanInProgress(d);
  writeAt(`${FRESH_PREFIX}${d}`);
}

export function clearFreshDiscoveryScan(domain: string): void {
  const d = cleanDomain(domain);
  if (!d) return;
  removeKey(`${FRESH_PREFIX}${d}`);
}

/** True while `/dashboard/searching` is running Apify for this domain. */
export function isDiscoveryScanInProgress(domain: string): boolean {
  const d = cleanDomain(domain);
  if (!d) return false;
  return readJson(`${IN_PROGRESS_PREFIX}${d}`) != null;
}

/** True for a short window after discovery finished — competitor loads must not re-scrape. */
export function isFreshDiscoveryScan(domain: string): boolean {
  const d = cleanDomain(domain);
  if (!d) return false;
  const row = readJson(`${FRESH_PREFIX}${d}`);
  if (!row) return false;
  if (Date.now() - row.at > FRESH_TTL_MS) {
    removeKey(`${FRESH_PREFIX}${d}`);
    return false;
  }
  return true;
}

/** Discovery scan active or just completed — never call Apify from competitor hydrate. */
export function shouldUseAdsLibraryCacheOnly(domain: string): boolean {
  return isDiscoveryScanInProgress(domain) || isFreshDiscoveryScan(domain);
}
