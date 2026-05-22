import {
  coerceAdsLibraryResponse,
  type AdsLibraryPlatform,
  type AdsLibraryResponse,
} from "./api-types";
import {
  fetchAdsLibraryDeduplicated,
  readAdsLibraryCacheLastKnownGood,
  stableAdsLibraryPayloadKey,
  writeAdsLibrarySessionCache,
} from "./deduped-fetch";
import { countLibraryAdsForPlatform, platformScrapeSucceeded } from "./library-response-utils";
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

function responseNeedsCreatives(expected: Partial<Record<AdsLibraryPlatform, number>>): boolean {
  return Object.values(expected).some((count) => count > 0);
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
 * Write scraped creatives into session handoff + payload caches, verify the brand page can read them,
 * and best-effort persist to Supabase before leaving the loading screen.
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
  const needsCreatives = responseNeedsCreatives(expected);

  if (needsCreatives && !isWorkspaceBrandAdsLibraryReady(response, expected)) {
    return { ready: false, hydratedResponse: response, persistedOk: false };
  }

  const clientPayloadKey = stableAdsLibraryPayloadKey(clientPayload);
  const scrapePayloadKey = stableAdsLibraryPayloadKey(scrapePayload);
  const cacheEntry = { response, httpOk };

  writeAdsLibrarySessionCache(clientPayloadKey, cacheEntry);
  writeAdsLibrarySessionCache(scrapePayloadKey, cacheEntry);
  writeWorkspaceBrandScrapeHandoff(domain, response, httpOk);

  let sessionVerified = false;
  for (let i = 0; i < 15; i++) {
    if (signal?.aborted) break;
    if (verifySessionHandoff({ domain, clientPayloadKey, expected })) {
      sessionVerified = true;
      break;
    }
    await sleep(100);
  }

  if (needsCreatives && !sessionVerified) {
    clearWorkspaceBrandScrapeHandoff(domain);
    return { ready: false, hydratedResponse: response, persistedOk: false };
  }

  let persistedOk = false;
  const persistDeadline = Date.now() + 120_000;
  while (!signal?.aborted && Date.now() < persistDeadline) {
    persistedOk = (await callEnsurePersisted(domain)) || persistedOk;
    if (persistedOk || !needsCreatives) break;
    await sleep(2_000);
  }

  const serverDeadline = Date.now() + 90_000;
  while (!signal?.aborted && Date.now() < serverDeadline) {
    try {
      const { response: serverJson, httpOk: serverOk } = await fetchAdsLibraryDeduplicated(clientPayload, {
        cacheOnly: true,
        clientSkipReadCache: true,
        signal,
      });
      if (serverOk) {
        const hydrated = coerceAdsLibraryResponse(serverJson);
        if (isWorkspaceBrandAdsLibraryReady(hydrated, expected)) {
          return { ready: true, hydratedResponse: response, persistedOk };
        }
      }
    } catch (e) {
      if (signal?.aborted) break;
      if (e instanceof DOMException && e.name === "AbortError") break;
    }
    await sleep(2_000);
  }

  if (sessionVerified) {
    return { ready: true, hydratedResponse: response, persistedOk };
  }

  clearWorkspaceBrandScrapeHandoff(domain);
  return { ready: false, hydratedResponse: response, persistedOk };
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
