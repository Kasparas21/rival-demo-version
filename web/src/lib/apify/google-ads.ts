import { flattenApifyDatasetRecord, runApifyActor } from "@/lib/apify/client";
import { GOOGLE_ADS_LIBRARY_MAX_ITEMS } from "@/lib/ad-library/constants";
import type { GoogleCompanyAdItem } from "@/lib/ad-library/apify-raw-types";
import { normalizeGoogleApiItem } from "@/lib/ad-library/normalize";
import {
  APIFY_HEAVY_ACTOR_MEMORY_MBYTES,
  readApifyActorMemoryMbytes,
} from "@/lib/apify/memory";

/** Default: `lurkapi/google-ads-scraper`. Override with `APIFY_GOOGLE_ADS_ACTOR`. */
const DEFAULT_GOOGLE_ACTOR = "lurkapi/google-ads-scraper";
const MAX_TIMEOUT_SECS = 3600;

/**
 * Same creatives and shown dates as lurkapi (verified on 178 ads), decodes far more ad copy, about half
 * the price per new creative — and with a memory name, creatives it already delivered come back free.
 */
const CRAFT_GOOGLE_ACTOR = "automation_craft/google-ads-transparency-scraper";
/** Its default; the start fee is charged per GB of run memory. */
const CRAFT_MEMORY_MBYTES = 256;
/** Decoding runs ~0.65s per new creative; stop well inside the 300s cron budget instead of being cut off. */
const CRAFT_TIMEOUT_SECS = 240;

export type GoogleAdsActor = "craft" | "lurkapi";

/**
 * `GOOGLE_ACTOR_MODE`: `refresh` (default) runs automation_craft for dated refreshes — few creatives,
 * mostly already known — and lurkapi for full-history sweeps, where decoding hundreds of creatives
 * would outlast the cron. `craft` or `lurkapi` forces one actor everywhere.
 */
export function resolveGoogleAdsActor(
  params: { dated: boolean },
  mode = process.env.GOOGLE_ACTOR_MODE,
): GoogleAdsActor {
  const m = mode?.trim().toLowerCase();
  if (m === "craft" || m === "lurkapi") return m;
  return params.dated ? "craft" : "lurkapi";
}

/** Actor memory name for one saved competitor, so known creatives are recognised across refreshes. */
export function googleAdsMemoryKey(competitorId: string): string {
  return `rival-google-${competitorId}`;
}

export function buildCraftGoogleAdsInput(params: {
  urls: string[];
  limit: number;
  region?: string;
  startDate?: string;
  endDate?: string;
  memoryKey?: string;
}): Record<string, unknown> {
  const region = params.region?.trim().toUpperCase() ?? "";
  const dated = Boolean(params.startDate && params.endDate);
  return {
    advertisers: params.urls,
    region: /^[A-Z]{2}$/.test(region) ? region : "ANYWHERE",
    sort: "lastShown",
    maxCreativesPerAdvertiser: params.limit,
    maxTotal: params.limit,
    /** Copy, display URL, targeting and per-region stats — the fields lurkapi's output options give. */
    decodeCreatives: true,
    ocrImageOnlyText: false,
    ...(dated ? { lastShownAfter: params.startDate, lastShownBefore: params.endDate } : {}),
    ...(params.memoryKey ? { memoryName: params.memoryKey, emitKnown: true } : {}),
  };
}

function craftNonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/**
 * One automation_craft creative → the keys `normalizeGoogleApiItem` reads for lurkapi rows.
 * Known creatives (`isNew: false`) only carry fresh dates and previews; their copy, targeting and
 * regions weren't re-fetched, so they're flagged `knownCreative` for a lifecycle-only merge.
 */
export function craftItemToGoogleRecord(item: Record<string, unknown>): Record<string, unknown> {
  const ymd = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 10) : undefined);
  const creativeUrl = typeof item.transparencyUrl === "string" ? item.transparencyUrl.split("?")[0] : undefined;
  const advertiserId = typeof item.advertiserId === "string" ? item.advertiserId : undefined;
  const imageUrls = Array.isArray(item.imageUrls) ? item.imageUrls : [];

  const record: Record<string, unknown> = {
    advertiserId,
    advertiserName: item.advertiserName,
    creativeId: item.creativeId,
    adFormat: item.format,
    firstShown: ymd(item.firstShown),
    lastShown: ymd(item.lastShown),
    previewUrl: item.previewUrl ?? null,
    imageUrl: item.imageUrl ?? imageUrls[0] ?? null,
    youtubeVideoId: item.youtubeVideoId ?? null,
    /** The watch URL is what yields the `yt:<id>` stable key, as lurkapi's `videoUrl` does — without it, stored videos would duplicate. */
    ...(craftNonEmpty(item.youtubeUrl) ? { videoUrl: item.youtubeUrl } : {}),
    ...(creativeUrl ? { creativeUrl } : {}),
    ...(advertiserId ? { transparencyUrl: `https://adstransparency.google.com/advertiser/${advertiserId}` } : {}),
  };
  if (craftNonEmpty(item.headline)) record.headline = item.headline;
  if (craftNonEmpty(item.description)) record.description = item.description;
  if (craftNonEmpty(item.displayUrl)) record.destinationUrl = item.displayUrl;
  const audience = (item.targeting as Record<string, unknown> | null)?.audienceSelection as
    | Record<string, unknown>
    | undefined;
  if (audience) {
    /** lurkapi's targeting shape, so the stored summary reads the same. */
    record.targeting = {
      hasTargeting: true,
      demographics: audience.demographics,
      geography: audience.geographicLocations,
      contextual: audience.contextualSignals,
    };
  }
  if (Array.isArray(item.regionStats) && item.regionStats.length > 0) {
    record.regionStats = item.regionStats.map((r: Record<string, unknown>) => ({
      region: r.region,
      lastShown: r.lastShown,
      ...(typeof r.impressionsUpper === "number" ? { impressionsMax: r.impressionsUpper } : {}),
    }));
  }
  if (item.isNew === false) record.knownCreative = true;
  return record;
}

/**
 * RAM for the Google Transparency Apify run. Many actors default to 4096MB, which can exceed
 * account memory caps. Override with `GOOGLE_ADS_MEMORY_MBYTES` (e.g. 2048, 1024).
 */
export function readGoogleAdsMemoryMbytes(): number {
  return readApifyActorMemoryMbytes("GOOGLE_ADS_MEMORY_MBYTES", APIFY_HEAVY_ACTOR_MEMORY_MBYTES);
}

/** Google Transparency blocks datacenter IPs — residential avoids captcha (actor error message). */
export function readGoogleResidentialProxyGroups(): string[] {
  const raw = process.env.APIFY_GOOGLE_USE_RESIDENTIAL?.trim().toLowerCase();
  if (raw && ["0", "false", "no", "off"].includes(raw)) return [];
  return ["RESIDENTIAL"];
}

export function extractGoogleApifyFailureMessage(row: Record<string, unknown>): string | null {
  const status = typeof row.status === "string" ? row.status.trim() : "";
  if (!status) return null;
  if (
    /^failed\b/i.test(status) ||
    /blocked|captcha|unable to reach|proxy rotation/i.test(status)
  ) {
    return status;
  }
  return null;
}

export function isLikelyGoogleAdRow(row: Record<string, unknown>): boolean {
  if (extractGoogleApifyFailureMessage(row)) return false;
  const keys = [
    "headline",
    "description",
    "previewUrl",
    "creativeUrl",
    "advertiserName",
    "creativeId",
    "advertiserId",
    "adFormat",
  ];
  return keys.some((k) => {
    const v = row[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}

/**
 * Google Ads Transparency via Apify (`lurkapi/google-ads-scraper`).
 * Pass Transparency advertiser/creative URLs or `?domain=` listing URLs in `startUrls`.
 * Paid add-ons (OCR, landing pages, etc.) stay off by default to limit cost.
 * Region enrichment and targeting locations are enabled for richer scrape output.
 */
export async function scrapeGoogleAdsTransparency(params: {
  startUrls: string[];
  resultsLimit: number;
  region?: string;
  /** Only creatives shown in this YYYY-MM-DD window — scheduled refreshes since the last scrape. */
  startDate?: string;
  endDate?: string;
  /** automation_craft memory name; known creatives come back free, flagged `knownCreative`. */
  memoryKey?: string;
}): Promise<GoogleCompanyAdItem[]> {
  /** Overrides the lurkapi-format actor only; automation_craft takes a different input. */
  const actorId = process.env.APIFY_GOOGLE_ADS_ACTOR?.trim() || DEFAULT_GOOGLE_ACTOR;
  const urls = params.startUrls.map((u) => u.trim()).filter(Boolean);

  if (urls.length === 0) {
    throw new Error("At least one Transparency Center URL is required for Google ads");
  }

  const limit = Math.max(1, Math.min(params.resultsLimit, GOOGLE_ADS_LIBRARY_MAX_ITEMS));
  const dated = Boolean(params.startDate?.trim() && params.endDate?.trim());

  if (resolveGoogleAdsActor({ dated }) === "craft") {
    return scrapeGoogleAdsWithCraft({
      urls,
      limit,
      region: params.region,
      ...(dated ? { startDate: params.startDate!.trim(), endDate: params.endDate!.trim() } : {}),
      memoryKey: params.memoryKey,
    });
  }

  const input: Record<string, unknown> = {
    fastMode: false,
    includeFormatImage: true,
    includeFormatText: true,
    includeFormatVideo: true,
    includeLandingPage: false,
    includeMediaDownload: false,
    includeOcr: false,
    includeRegionEnrichment: false,
    includeTargetingLocations: false,
    maxAdsPerAdvertiser: limit,
    outputDescription: true,
    outputDestinationUrl: true,
    outputHeadline: true,
    outputRegionStats: true,
    outputTargeting: true,
    outputVariants: true,
    politicalAdsOnly: false,
    proxyConfig: {
      useApifyProxy: true,
      apifyProxyGroups: readGoogleResidentialProxyGroups(),
    },
    region: params.region?.trim() || "anywhere",
    shouldDownloadPreviews: false,
    startUrls: urls.map((url) => ({ url })),
    maxAdvertisersPerDomain: 1,
    platform: "any",
    /** "Active window overlaps" the range: every creative shown in it, however old. */
    ...(dated ? { startDate: params.startDate!.trim(), endDate: params.endDate!.trim() } : {}),
  };

  const { items } = await runApifyActor<Record<string, unknown>>(
    actorId,
    input,
    {
      waitSecs: MAX_TIMEOUT_SECS,
      timeoutSecs: MAX_TIMEOUT_SECS,
      maxItems: limit,
      memoryMbytes: readGoogleAdsMemoryMbytes(),
    }
  );

  const flattened = items.map((raw) => {
    const row =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? flattenApifyDatasetRecord(raw as Record<string, unknown>)
        : {};
    return row;
  });

  const failures = flattened
    .map((row) => extractGoogleApifyFailureMessage(row))
    .filter((msg): msg is string => Boolean(msg));

  const adRows = flattened.filter(isLikelyGoogleAdRow);
  const normalized = adRows.map((row) => normalizeGoogleApiItem(row) as GoogleCompanyAdItem);

  if (normalized.length === 0) {
    if (failures.length > 0) {
      throw new Error(failures[0]);
    }
    if (flattened.length > 0) {
      throw new Error("Google Ads Transparency returned no ads for this advertiser.");
    }
  }

  return normalized;
}

async function scrapeGoogleAdsWithCraft(params: {
  urls: string[];
  limit: number;
  region?: string;
  startDate?: string;
  endDate?: string;
  memoryKey?: string;
}): Promise<GoogleCompanyAdItem[]> {
  const { items } = await runApifyActor<Record<string, unknown>>(
    CRAFT_GOOGLE_ACTOR,
    buildCraftGoogleAdsInput(params),
    {
      waitSecs: CRAFT_TIMEOUT_SECS + 30,
      timeoutSecs: CRAFT_TIMEOUT_SECS,
      // + the run-summary row
      maxItems: params.limit + 1,
      memoryMbytes: CRAFT_MEMORY_MBYTES,
    }
  );

  const creatives = items.filter((row) => row?.type === "creative");
  if (creatives.length === 0) {
    /** No creatives in a dated window is a normal quiet stretch; a run that didn't finish is not. */
    const summary = items.find((row) => row?.type === "run-summary");
    const warnings = Array.isArray(summary?.warnings) ? (summary.warnings as unknown[]) : [];
    if (summary && summary.stopReason !== "complete") {
      throw new Error(`Google Ads Transparency run stopped early (${String(summary.stopReason)})`);
    }
    if (warnings.length > 0) throw new Error(String(warnings[0]));
  }

  return creatives.map((row) => {
    const record = craftItemToGoogleRecord(row);
    const normalized = normalizeGoogleApiItem(record) as GoogleCompanyAdItem;
    return record.knownCreative ? { ...normalized, knownCreative: true } : normalized;
  });
}
