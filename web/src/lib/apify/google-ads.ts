import { runApifyActor } from "@/lib/apify/client";
import { GOOGLE_ADS_LIBRARY_MAX_ITEMS } from "@/lib/ad-library/constants";
import type { GoogleCompanyAdItem } from "@/lib/ad-library/apify-raw-types";
import { normalizeGoogleApiItem } from "@/lib/ad-library/normalize";

const DEFAULT_GOOGLE_ACTOR = "6A1ur9FZtzzUuwWtx";
const MAX_TIMEOUT_SECS = 3600;

/**
 * RAM for the Google Transparency Apify run. Many actors default to 4096MB, which can exceed
 * account memory caps. Override with `GOOGLE_ADS_MEMORY_MBYTES` (e.g. 2048, 1024).
 */
function readGoogleAdsMemoryMbytes(): number {
  const raw = process.env.GOOGLE_ADS_MEMORY_MBYTES?.trim();
  if (!raw) return 2048;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 256) return 2048;
  return Math.min(n, 8192);
}

function cleanDomain(d: string): string {
  return d.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || d;
}

/**
 * Google Ads Transparency via Apify. Pass domain and/or brand in searchTerms.
 */
export async function scrapeGoogleAdsTransparency(params: {
  searchTerms: string[];
  region?: string;
  resultsLimit: number;
  skipDetails: boolean;
  startUrls?: string[];
}): Promise<GoogleCompanyAdItem[]> {
  const actorId = process.env.APIFY_GOOGLE_ADS_ACTOR?.trim() || DEFAULT_GOOGLE_ACTOR;
  const terms = params.searchTerms.map((t) => t.trim()).filter(Boolean);
  const urls = (params.startUrls ?? []).map((u) => u.trim()).filter(Boolean);

  if (terms.length === 0 && urls.length === 0) {
    throw new Error("At least one search term or start URL is required for Google ads");
  }

  const limit = Math.max(1, Math.min(params.resultsLimit, GOOGLE_ADS_LIBRARY_MAX_ITEMS));

  const input: Record<string, unknown> = {
    region: params.region?.trim() || "anywhere",
    resultsLimit: limit,
    skipDetails: params.skipDetails,
  };
  if (urls.length) input.startUrls = urls;
  if (terms.length) input.searchTerms = terms;

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

  return items.map((raw) => normalizeGoogleApiItem(raw) as GoogleCompanyAdItem);
}

export function buildGoogleSearchTerms(domain: string, brandName: string): string[] {
  const d = cleanDomain(domain);
  const terms = new Set<string>();
  if (d) terms.add(d);
  const n = brandName.trim();
  if (n && n.toLowerCase() !== d.toLowerCase()) terms.add(n);
  return [...terms];
}
