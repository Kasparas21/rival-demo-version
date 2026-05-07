import { runApifyActor } from "@/lib/apify/client";

const DEFAULT_ACTOR = "zadexinho/snapchat-ads-scraper";
const MAX_GLOBAL = 10000;
const POLL_WAIT_SECS = 300;

/** EU-27 ISO 3166-1 alpha-2 (matches typical DSA Snapchat EU gallery coverage). */
export const SNAPCHAT_EU_COUNTRY_CODES = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
] as const;

export type SnapchatEuCountry = (typeof SNAPCHAT_EU_COUNTRY_CODES)[number];

export function snapchatEuSet(): Set<string> {
  return new Set(SNAPCHAT_EU_COUNTRY_CODES);
}

/** Derive searchable brand-ish token — second-level domain label when possible. */
export function snapchatBrandSearchToken(domain: string, brandName: string): string {
  const cleaned = domain.replace(/^https?:\/\//i, "").replace(/^www\./i, "").trim().split(/[/?#]/)[0] ?? "";
  const labels = cleaned.split(".").filter(Boolean);
  const second =
    labels.length >= 2 ? labels[labels.length - 2] : labels.length === 1 ? labels[0] : "";
  const slug = second?.replace(/-/g, " ").trim();
  const name = brandName.trim();
  const pick =
    slug && slug.length > 1 && !/^[0-9]+$/.test(slug) ? slug : name || slug || cleaned;
  return pick.slice(0, 140);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function numImpressionsRow(row: Record<string, unknown>): number {
  const keys = [
    "impressions",
    "Impressions",
    "impressionCount",
    "estimatedImpressions",
    "estimated_impressions",
    "reach",
    "euReach",
  ];
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && /^\d+$/.test(v.trim())) return Number(v.trim());
  }
  const nested =
    typeof row.insights === "object" &&
    row.insights !== null &&
    typeof (row.insights as Record<string, unknown>).impressions === "number"
      ? ((row.insights as Record<string, unknown>).impressions as number)
      : NaN;
  return Number.isFinite(nested) ? nested : 0;
}

export function stableSnapchatRowId(row: Record<string, unknown>): string {
  const v = row.adId ?? row.ad_id ?? row.adID ?? row.id ?? row.snapAdId ?? row.adLibraryId ?? row.uuid;
  return String(v ?? "");
}

/** Merge actor rows across countries — dedupe IDs, prefer higher impressions, sort desc. */
export function mergeSnapchatRowsDeduped(rows: Record<string, unknown>[], maxCap: number): Record<string, unknown>[] {
  const bestById = new Map<string, Record<string, unknown>>();
  const noIdBucket: Record<string, unknown>[] = [];
  for (const row of rows) {
    const id = stableSnapchatRowId(row);
    if (!id) {
      noIdBucket.push(row);
      continue;
    }
    const prev = bestById.get(id);
    if (!prev || numImpressionsRow(row) > numImpressionsRow(prev)) {
      bestById.set(id, row);
    }
  }
  const merged = [...bestById.values(), ...noIdBucket];
  merged.sort((a, b) => numImpressionsRow(b) - numImpressionsRow(a));
  return merged.slice(0, Math.max(0, maxCap));
}

/**
 * Snapchat EU Ads Gallery (`zadexinho/snapchat-ads-scraper`):
 * one country per actor run — multi-country sweep uses small concurrent batches + dedupe merge.
 */
export async function scrapeSnapchatEuAdsGallery(params: {
  domain: string;
  brandName: string;
  maxItemsGlobal: number;
  /** Single EU ISO2; omit or `"ALL"` to sweep SNAPCHAT_EU_COUNTRY_CODES. */
  countryCode?: string;
  startDate?: string;
  endDate?: string;
  status?: "ACTIVE" | "PAUSED";
}): Promise<Record<string, unknown>[]> {
  const actorId = process.env.APIFY_SNAPCHAT_ADS_ACTOR?.trim() || DEFAULT_ACTOR;
  const maxCap = Math.max(1, Math.min(params.maxItemsGlobal || 100, MAX_GLOBAL));
  const search = snapchatBrandSearchToken(params.domain, params.brandName);
  let startDate =
    params.startDate?.trim() && ISO_DATE_RE.test(params.startDate.trim())
      ? params.startDate.trim()
      : "";
  let endDate =
    params.endDate?.trim() && ISO_DATE_RE.test(params.endDate.trim())
      ? params.endDate.trim()
      : "";
  if (startDate && endDate && startDate > endDate) {
    const t = startDate;
    startDate = endDate;
    endDate = t;
  }

  const eu = snapchatEuSet();
  const rawCc = params.countryCode?.trim().toUpperCase() ?? "";
  const countries: SnapchatEuCountry[] =
    rawCc && eu.has(rawCc) ? ([rawCc] as SnapchatEuCountry[]) : ([ "DE" ] as SnapchatEuCountry[]);

  const perCountryLimit = (countriesCount: number, maxItems: number): number => {
    if (countriesCount <= 1)
      return Math.max(10, Math.min(maxItems, MAX_GLOBAL));
    return Math.min(
      300,
      Math.max(10, Math.ceil((maxItems * 2) / countriesCount))
    );
  };

  const limitEach = perCountryLimit(countries.length, maxCap);

  const runOneCountry = async (country: SnapchatEuCountry) => {
    const input: Record<string, unknown> = {
      search,
      country,
      maxItems: limitEach,
    };
    if (startDate) input.startDate = startDate;
    if (endDate) input.endDate = endDate;
    if (params.status) input.status = params.status;

    const { items } = await runApifyActor<Record<string, unknown>>(actorId, input, {
      waitSecs: POLL_WAIT_SECS,
      timeoutSecs: POLL_WAIT_SECS,
      maxItems: limitEach,
    });
    return items;
  };

  const all: Record<string, unknown>[] = [];
  const batchSize = 8;
  for (let i = 0; i < countries.length; i += batchSize) {
    const slice = countries.slice(i, i + batchSize);
    const settled = await Promise.allSettled(slice.map((cc) => runOneCountry(cc)));
    for (const s of settled) {
      if (s.status === "fulfilled") {
        all.push(...s.value);
      }
    }
  }

  return mergeSnapchatRowsDeduped(all, maxCap);
}

/** EU gallery options for UI — one ISO2 per scrape (no “all EU” sweep). Sorted ISO A–Z (same as other region chip rows). */
export function buildSnapchatEuGalleryCountryOptions(): { value: string; label: string }[] {
  const codes = [...SNAPCHAT_EU_COUNTRY_CODES].sort((a, b) => a.localeCompare(b, "en"));
  if (typeof Intl !== "undefined" && typeof Intl.DisplayNames !== "undefined") {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return codes.map((code) => ({
      value: code,
      label: `${dn.of(code) ?? code} (${code})`,
    }));
  }
  return codes.map((code) => ({ value: code, label: code }));
}