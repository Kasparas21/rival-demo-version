import { runApifyActor } from "@/lib/apify/client";
import { readGoogleAdsMemoryMbytes, readGoogleResidentialProxyGroups } from "@/lib/apify/google-ads";
import { readFacebookAdsMemoryMbytes } from "@/lib/apify/memory";
import { readCreativeText, isUnusableTranscription } from "@/lib/ad-library/transcribe-ad-creatives";
import {
  googleAdvertiserRows,
  metaSampleFromItem,
  websiteFacebookKeysFromHtml,
  type GoogleAdvertiserRow,
} from "@/lib/ad-account-discovery/parse";
import {
  domainLabel,
  hostOf,
  registrableDomain,
  scoreGoogleAdvertisers,
  scoreMetaPages,
  type BrandContext,
  type GoogleAdvertiserCandidate,
  type MetaAdSample,
  type MetaPageCandidate,
} from "@/lib/ad-account-discovery/score";

/**
 * Finds the ad accounts behind a brand's website, on demand when someone adds a competitor:
 *
 * 1. The website's own Facebook links (free).
 * 2. Meta Ad Library ads that mention the domain: each names the page that paid and where it links.
 * 3. The ads of the pages the website links to, with targeted countries (catches lead-form-only pages).
 * 4. A brand-name search, only when 2–3 found no page of the brand's own.
 * 5. Google advertisers Google lists for the domain, each verified by reading one of its ads.
 *
 * About $0.05–0.15 a run (Meta $0.00075 an ad; Google ~$0.03 a lookup; ~$0.0002 per ad image read).
 * Nothing here runs on a schedule.
 */

const META_ACTOR = () => process.env.APIFY_FACEBOOK_ADS_ACTOR?.trim() || "curious_coder/facebook-ads-library-scraper";
const GOOGLE_ACTOR = () => process.env.APIFY_GOOGLE_ADS_ACTOR?.trim() || "lurkapi/google-ads-scraper";

const DOMAIN_SEARCH_ADS = 40;
const LINKED_PAGE_ADS = 10;
const NAME_SEARCH_ADS = 30;
const MAX_LINKED_PAGES = 2;
const MAX_GOOGLE_ADVERTISERS = 8;
const ACTOR_TIMEOUT_SECS = 150;
const WEBSITE_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;

export type AdAccountDiscovery = {
  host: string;
  brandName: string;
  meta: MetaPageCandidate[];
  google: GoogleAdvertiserCandidate[];
  /** Facebook pages the website links to that showed no active ads. */
  linkedPagesWithoutAds: string[];
  /** Searches that failed, so an empty list isn't read as "no accounts". */
  failed: ("meta" | "google")[];
};

/* ---------- Apify concurrency ---------- */

/** The Apify account runs at most 5 actors at once; leave room for scrapes running elsewhere. */
const MAX_PARALLEL_RUNS = 3;
let running = 0;
const waiting: (() => void)[] = [];

async function withRunSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL_RUNS) await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  try {
    return await fn();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run an actor in a slot, waiting and retrying when the account is at its concurrent-run limit. */
async function runActor(
  actorId: string,
  input: Record<string, unknown>,
  opts: { maxItems: number; memoryMbytes: number },
): Promise<unknown[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      const { items } = await withRunSlot(() =>
        runApifyActor<unknown>(actorId, input, {
          waitSecs: ACTOR_TIMEOUT_SECS,
          timeoutSecs: ACTOR_TIMEOUT_SECS,
          ...opts,
        }),
      );
      return items;
    } catch (e) {
      const busy = e instanceof Error && /concurrent-runs-limit-exceeded|concurrent runs/i.test(e.message);
      if (!busy || attempt >= 3) throw e;
      await sleep([3_000, 8_000, 15_000][attempt]!);
    }
  }
}

/* ---------- sources ---------- */

async function fetchWebsiteFacebookKeys(host: string): Promise<string[]> {
  try {
    const res = await fetch(`https://${host}/`, {
      redirect: "follow",
      signal: AbortSignal.timeout(WEBSITE_TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RivalBot/1.0)", Accept: "text/html" },
    });
    if (!res.ok) return [];
    const html = (await res.text()).slice(0, MAX_HTML_BYTES);
    return websiteFacebookKeysFromHtml(html);
  } catch {
    return [];
  }
}

function metaSearchUrl(query: string): string {
  const params = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country: "ALL",
    q: query,
    search_type: "keyword_unordered",
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

async function metaAds(urls: string[], count: number, details: boolean): Promise<MetaAdSample[]> {
  const items = await runActor(
    META_ACTOR(),
    {
      urls: urls.map((url) => ({ url })),
      count: Math.max(10, count),
      scrapeAdDetails: details,
      "scrapePageAds.countryCode": "ALL",
      "scrapePageAds.activeStatus": "active",
      proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
    },
    { maxItems: Math.max(10, count) * urls.length, memoryMbytes: readFacebookAdsMemoryMbytes(urls.length) },
  );
  return items.map(metaSampleFromItem).filter((s): s is MetaAdSample => s != null);
}

async function googleAdvertisersForDomain(domain: string): Promise<GoogleAdvertiserRow[]> {
  const items = await runActor(
    GOOGLE_ACTOR(),
    {
      domains: [domain],
      maxAdvertisersPerDomain: MAX_GOOGLE_ADVERTISERS,
      maxAdsPerAdvertiser: 1,
      fastMode: true,
      region: "anywhere",
      platform: "any",
      includeLandingPage: false,
      includeMediaDownload: false,
      includeOcr: false,
      shouldDownloadPreviews: false,
      proxyConfig: { useApifyProxy: true, apifyProxyGroups: readGoogleResidentialProxyGroups() },
    },
    { maxItems: MAX_GOOGLE_ADVERTISERS * 2, memoryMbytes: readGoogleAdsMemoryMbytes() },
  );
  return googleAdvertiserRows(items).slice(0, MAX_GOOGLE_ADVERTISERS);
}

/** The text of one of the advertiser's ads: published copy, else its preview script, else its image. */
async function readAdvertiserAd(row: GoogleAdvertiserRow): Promise<string | null> {
  if (row.publishedText && row.publishedText.length >= 10) return row.publishedText;
  for (const src of row.creatives.slice(0, 2)) {
    const r = await readCreativeText(src);
    if (r.ok && !isUnusableTranscription(r.text)) return r.text;
  }
  return null;
}

/* ---------- orchestration ---------- */

export async function discoverAdAccounts(input: {
  url: string;
  brandName?: string | null;
  market?: string | null;
}): Promise<AdAccountDiscovery> {
  const host = hostOf(input.url);
  if (!host || !host.includes(".")) throw new Error("A website domain is required");
  const domain = registrableDomain(host);
  const brandName = input.brandName?.trim() || domainLabel(host);
  const failed: AdAccountDiscovery["failed"] = [];

  const googleTask = (async (): Promise<GoogleAdvertiserCandidate[]> => {
    try {
      const rows = await googleAdvertisersForDomain(domain);
      const texts = await Promise.all(rows.map(readAdvertiserAd));
      const ctx: BrandContext = { host, brandName, websiteFacebookKeys: [], market: input.market };
      return scoreGoogleAdvertisers(
        rows.map((r, i) => ({ advertiserId: r.advertiserId, advertiserName: r.advertiserName, adText: texts[i] ?? null })),
        ctx,
      );
    } catch (e) {
      console.warn("[ad-account-discovery] google", e instanceof Error ? e.message : e);
      failed.push("google");
      return [];
    }
  })();

  const websiteKeys = await fetchWebsiteFacebookKeys(host);
  const ctx: BrandContext = { host, brandName, websiteFacebookKeys: websiteKeys, market: input.market };

  let meta: MetaPageCandidate[] = [];
  let linkedPagesWithoutAds: string[] = [];
  try {
    const linkedPages = websiteKeys.slice(0, MAX_LINKED_PAGES);
    const [domainSamples, ...linkedSamples] = await Promise.all([
      metaAds([metaSearchUrl(domain)], DOMAIN_SEARCH_ADS, false),
      ...linkedPages.map((key) => metaAds([`https://www.facebook.com/${key}`], LINKED_PAGE_ADS, true)),
    ]);
    let samples = [...domainSamples!, ...linkedSamples.flat()];
    linkedPagesWithoutAds = linkedPages.filter((_, i) => (linkedSamples[i]?.length ?? 0) === 0).map((k) => `facebook.com/${k}`);
    meta = scoreMetaPages(samples, ctx);
    if (!meta.some((c) => c.role === "brand" || c.role === "country")) {
      samples = [...samples, ...(await metaAds([metaSearchUrl(brandName)], NAME_SEARCH_ADS, false))];
      meta = scoreMetaPages(samples, ctx);
    }
  } catch (e) {
    console.warn("[ad-account-discovery] meta", e instanceof Error ? e.message : e);
    failed.push("meta");
  }

  const google = await googleTask;
  return { host, brandName, meta, google, linkedPagesWithoutAds, failed };
}
