import {
  coerceAdsLibraryResponse,
  type AdsLibraryPlatform,
  type AdsLibraryResponse,
} from "./api-types";
import {
  readAdsLibraryCacheLastKnownGood,
  stableAdsLibraryPayloadKey,
  writeAdsLibrarySessionCache,
} from "./deduped-fetch";
import { countLibraryAdsForPlatform, platformScrapeSucceeded } from "./library-response-utils";
import { ALL_ADS_API_PLATFORMS } from "./channels-to-platforms";
import {
  clearWorkspaceBrandScrapeHandoff,
  readWorkspaceBrandScrapeHandoff,
  writeWorkspaceBrandScrapeHandoff,
} from "./workspace-brand-scrape-handoff";

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

export function totalScrapedCreatives(response: AdsLibraryResponse): number {
  return ALL_ADS_API_PLATFORMS.reduce(
    (sum, p) => sum + countLibraryAdsForPlatform(p, response),
    0
  );
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

function verifySessionHandoff(params: {
  domain: string;
  clientPayloadKey: string;
  expected: Partial<Record<AdsLibraryPlatform, number>>;
}): boolean {
  const handoff = readWorkspaceBrandScrapeHandoff(params.domain);
  const cached = readAdsLibraryCacheLastKnownGood(params.clientPayloadKey);
  const candidate = handoff ?? cached;
  if (!candidate) return false;
  return isWorkspaceBrandAdsLibraryReady(
    coerceAdsLibraryResponse(candidate.response as AdsLibraryResponse),
    params.expected
  );
}

/**
 * Write scraped creatives into session handoff + payload caches, then allow navigation.
 * Never blocks more than a few seconds — persist continues in the background on the brand page.
 */
export async function finalizeWorkspaceBrandAdsLibraryForNavigation(params: {
  domain: string;
  clientPayload: Record<string, unknown>;
  scrapePayload: Record<string, unknown>;
  scrapedResponse: AdsLibraryResponse;
  adsPlatforms: AdsLibraryPlatform[];
  httpOk: boolean;
  signal?: AbortSignal;
}): Promise<WorkspaceBrandAdsReadinessResult> {
  const {
    domain,
    clientPayload,
    scrapePayload,
    scrapedResponse,
    adsPlatforms,
    httpOk,
    signal,
  } = params;

  const response = coerceAdsLibraryResponse(scrapedResponse);
  const expected = expectedAdsCountsFromScrape(response, adsPlatforms);
  const creativeCount = totalScrapedCreatives(response);

  if (creativeCount === 0) {
    return { ready: true, hydratedResponse: response, persistedOk: false };
  }

  const clientPayloadKey = stableAdsLibraryPayloadKey(clientPayload);
  const scrapePayloadKey = stableAdsLibraryPayloadKey(scrapePayload);
  const cacheEntry = { response, httpOk };

  writeAdsLibrarySessionCache(clientPayloadKey, cacheEntry);
  writeAdsLibrarySessionCache(scrapePayloadKey, cacheEntry);
  writeWorkspaceBrandScrapeHandoff(domain, response, httpOk);

  let sessionVerified = false;
  for (let i = 0; i < 20; i++) {
    if (signal?.aborted) break;
    if (verifySessionHandoff({ domain, clientPayloadKey, expected })) {
      sessionVerified = true;
      break;
    }
    await sleep(100);
  }

  void callEnsurePersisted(domain);

  if (sessionVerified || creativeCount > 0) {
    return { ready: true, hydratedResponse: response, persistedOk: sessionVerified };
  }

  clearWorkspaceBrandScrapeHandoff(domain);
  return { ready: false, hydratedResponse: response, persistedOk: false };
}

/** @deprecated Use {@link finalizeWorkspaceBrandAdsLibraryForNavigation}. */
export async function waitForWorkspaceBrandAdsLibraryReady(params: {
  domain: string;
  clientPayload: Record<string, unknown>;
  scrapedResponse: AdsLibraryResponse;
  adsPlatforms: AdsLibraryPlatform[];
  maxWaitMs?: number;
  pollIntervalMs?: number;
  signal?: AbortSignal;
}): Promise<WorkspaceBrandAdsReadinessResult> {
  return finalizeWorkspaceBrandAdsLibraryForNavigation({
    domain: params.domain,
    clientPayload: params.clientPayload,
    scrapePayload: params.clientPayload,
    scrapedResponse: params.scrapedResponse,
    adsPlatforms: params.adsPlatforms,
    httpOk: true,
    signal: params.signal,
  });
}
