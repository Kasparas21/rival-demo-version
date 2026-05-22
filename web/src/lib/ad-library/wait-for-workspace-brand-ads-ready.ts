import {
  coerceAdsLibraryResponse,
  type AdsLibraryPlatform,
  type AdsLibraryResponse,
} from "./api-types";
import { fetchAdsLibraryDeduplicated } from "./deduped-fetch";
import { countLibraryAdsForPlatform, platformScrapeSucceeded } from "./library-response-utils";

export type WorkspaceBrandAdsReadinessResult = {
  ready: boolean;
  hydratedResponse: AdsLibraryResponse;
  persistedOk: boolean;
};

export function expectedAdsCountsFromScrape(
  scraped: AdsLibraryResponse,
  platforms: AdsLibraryPlatform[]
): Partial<Record<AdsLibraryPlatform, number>> {
  const out: Partial<Record<AdsLibraryPlatform, number>> = {};
  for (const p of platforms) {
    if (!platformScrapeSucceeded(scraped, p)) continue;
    out[p] = countLibraryAdsForPlatform(p, scraped);
  }
  return out;
}

/** True when cache hydration matches what the initial scrape returned (per platform). */
export function isWorkspaceBrandAdsLibraryReady(
  hydrated: AdsLibraryResponse,
  expected: Partial<Record<AdsLibraryPlatform, number>>
): boolean {
  for (const [platform, expectedCount] of Object.entries(expected) as [
    AdsLibraryPlatform,
    number,
  ][]) {
    if (!platformScrapeSucceeded(hydrated, platform)) return false;
    const actual = countLibraryAdsForPlatform(platform, hydrated);
    if (expectedCount > 0 && actual === 0) return false;
  }
  return true;
}

async function callEnsurePersisted(domain: string): Promise<boolean> {
  try {
    const res = await fetch("/api/competitor/ads-library/ensure-persisted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { ok?: boolean };
    return json.ok === true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * After workspace-brand initial scrape, poll server `ads_cache` until the competitor page
 * payload would hydrate with the same creatives the user just scraped.
 */
export async function waitForWorkspaceBrandAdsLibraryReady(params: {
  domain: string;
  clientPayload: Record<string, unknown>;
  scrapedResponse: AdsLibraryResponse;
  adsPlatforms: AdsLibraryPlatform[];
  /** After this, polling slows but continues until ready (never navigate early). */
  maxWaitMs?: number;
  pollIntervalMs?: number;
  signal?: AbortSignal;
}): Promise<WorkspaceBrandAdsReadinessResult> {
  const {
    domain,
    clientPayload,
    scrapedResponse,
    adsPlatforms,
    maxWaitMs = 90_000,
    pollIntervalMs = 2_000,
    signal,
  } = params;

  const expected = expectedAdsCountsFromScrape(scrapedResponse, adsPlatforms);
  const expectedPlatforms = Object.keys(expected) as AdsLibraryPlatform[];

  if (expectedPlatforms.length === 0) {
    return {
      ready: true,
      hydratedResponse: scrapedResponse,
      persistedOk: false,
    };
  }

  const started = Date.now();
  let persistedOk = false;
  let lastHydrated: AdsLibraryResponse | null = null;
  let pollMs = pollIntervalMs;

  while (!signal?.aborted) {
    persistedOk = (await callEnsurePersisted(domain)) || persistedOk;

    try {
      const { response, httpOk } = await fetchAdsLibraryDeduplicated(clientPayload, {
        cacheOnly: true,
        clientSkipReadCache: true,
        signal,
      });
      if (httpOk) {
        const hydrated = coerceAdsLibraryResponse(response);
        lastHydrated = hydrated;
        if (isWorkspaceBrandAdsLibraryReady(hydrated, expected)) {
          return { ready: true, hydratedResponse: hydrated, persistedOk };
        }
      }
    } catch (e) {
      if (signal?.aborted) break;
      if (e instanceof DOMException && e.name === "AbortError") break;
    }

    if (Date.now() - started > maxWaitMs) {
      pollMs = Math.max(pollIntervalMs, 5_000);
    }
    await sleep(pollMs);
  }

  const fallback = lastHydrated ?? scrapedResponse;
  return {
    ready: isWorkspaceBrandAdsLibraryReady(fallback, expected),
    hydratedResponse: fallback,
    persistedOk,
  };
}
