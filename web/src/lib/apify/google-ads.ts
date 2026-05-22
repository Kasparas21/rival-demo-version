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
 * RAM for the Google Transparency Apify run. Many actors default to 4096MB, which can exceed
 * account memory caps. Override with `GOOGLE_ADS_MEMORY_MBYTES` (e.g. 2048, 1024).
 */
function readGoogleAdsMemoryMbytes(): number {
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
}): Promise<GoogleCompanyAdItem[]> {
  const actorId = process.env.APIFY_GOOGLE_ADS_ACTOR?.trim() || DEFAULT_GOOGLE_ACTOR;
  const urls = params.startUrls.map((u) => u.trim()).filter(Boolean);

  if (urls.length === 0) {
    throw new Error("At least one Transparency Center URL is required for Google ads");
  }

  const limit = Math.max(1, Math.min(params.resultsLimit, GOOGLE_ADS_LIBRARY_MAX_ITEMS));

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
