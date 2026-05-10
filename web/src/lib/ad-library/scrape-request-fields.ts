import {
  ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM,
  ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM,
} from "./constants";
/**
 * Extra POST `/api/ads/library` fields for per-platform Apify actors.
 */
export type ScrapeRequestFields = {
  metaMaxAds: number;
  /** Meta — ISO 3166-1 alpha-2 or `ALL` (from dropdown) */
  metaCountry: string;
  metaStartDate: string;
  metaEndDate: string;
  metaSortBy: string;

  linkedinMaxAds: number;
  linkedinDateRange: string;
  linkedinCountryCode: string;

  tiktokMaxAds: number;
  tiktokStartDate: string;
  tiktokEndDate: string;

  microsoftMaxSearchResults: number;
  /** Single Microsoft Transparency market code (e.g. `66` Germany). */
  microsoftCountryCode: string;
  microsoftStartDate: string;
  microsoftEndDate: string;

  pinterestMaxResults: number;
  pinterestStartDate: string;
  pinterestEndDate: string;
  pinterestGender: string;
  pinterestAge: string;

  /** Snapchat EU Ads Gallery — country filter (multi-market sweep configurable in scrape settings). */
  snapchatMaxItems: number;
  /** Blank or ALL → sweep EU set in `snapchat-ads.ts`; else single ISO2. */
  snapchatCountry: string;
  snapchatStartDate: string;
  snapchatEndDate: string;
};

export const LINKEDIN_DATE_RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: "all-time", label: "All time" },
  { value: "past-day", label: "Past day" },
  { value: "past-week", label: "Past week" },
  { value: "past-month", label: "Past month" },
  { value: "past-year", label: "Past year" },
];

export const META_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "impressions_desc", label: "Impressions (high → low)" },
  { value: "date_desc", label: "Date (newest first)" },
];

export const PINTEREST_GENDER_OPTIONS = ["ALL", "MALE", "FEMALE"] as const;
export const PINTEREST_AGE_OPTIONS = ["ALL", "18-24", "25-34", "35-44", "45-54", "55+"] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yMinusOneYearIso(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export function defaultScrapeRequestFields(): ScrapeRequestFields {
  return {
    metaMaxAds: ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM,
    metaCountry: "US",
    metaStartDate: "",
    metaEndDate: "",
    metaSortBy: "impressions_desc",
    linkedinMaxAds: ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM,
    linkedinDateRange: "past-year",
    linkedinCountryCode: "",
    tiktokMaxAds: ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM,
    tiktokStartDate: yMinusOneYearIso(),
    tiktokEndDate: todayIso(),
    microsoftMaxSearchResults: ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM,
    microsoftCountryCode: "66",
    microsoftStartDate: "",
    microsoftEndDate: "",
    pinterestMaxResults: ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM,
    pinterestStartDate: "",
    pinterestEndDate: "",
    pinterestGender: "ALL",
    pinterestAge: "ALL",
    snapchatMaxItems: ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM,
    /** Single EU market only (no multi-country sweep). */
    snapchatCountry: "DE",
    snapchatStartDate: "",
    snapchatEndDate: "",
  };
}

const STORAGE_KEY = "rival-ads-scrape-request-fields-v2";

function clampScrapeInt(n: unknown, cap: number, fallback: number): number {
  const x = typeof n === "number" ? n : typeof n === "string" ? Number.parseInt(n, 10) : NaN;
  if (!Number.isFinite(x)) return fallback;
  return Math.max(1, Math.min(Math.floor(x), cap));
}

/** Persisted session values may predate platform caps — clamp to max `cap`, fall back to default on invalid. */
export function normalizeScrapeRequestFieldsCaps(fields: ScrapeRequestFields): ScrapeRequestFields {
  const cap = ADS_LIBRARY_MAX_ITEMS_PER_PLATFORM;
  const def = ADS_LIBRARY_DEFAULT_ITEMS_PER_PLATFORM;
  return {
    ...fields,
    metaMaxAds: clampScrapeInt(fields.metaMaxAds, cap, def),
    linkedinMaxAds: clampScrapeInt(fields.linkedinMaxAds, cap, def),
    tiktokMaxAds: clampScrapeInt(fields.tiktokMaxAds, cap, def),
    pinterestMaxResults: clampScrapeInt(fields.pinterestMaxResults, cap, def),
    snapchatMaxItems: clampScrapeInt(fields.snapchatMaxItems, cap, def),
    microsoftMaxSearchResults: clampScrapeInt(fields.microsoftMaxSearchResults, cap, def),
  };
}

export function readScrapeRequestFieldsFromStorage(): ScrapeRequestFields {
  if (typeof window === "undefined") return defaultScrapeRequestFields();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeScrapeRequestFieldsCaps(migrateLegacyScrapeFields());
    const parsed = JSON.parse(raw) as Partial<ScrapeRequestFields>;
    return normalizeScrapeRequestFieldsCaps({ ...defaultScrapeRequestFields(), ...parsed });
  } catch {
    return defaultScrapeRequestFields();
  }
}

/** Migrate v1 storage keys into v2 shape. */
function migrateLegacyScrapeFields(): ScrapeRequestFields {
  const base = defaultScrapeRequestFields();
  try {
    const legacy = sessionStorage.getItem("rival-ads-scrape-request-fields-v1");
    if (!legacy) return base;
    const p = JSON.parse(legacy) as Record<string, unknown>;
    return {
      ...base,
      ...(typeof p.metaMaxAds === "number" ? { metaMaxAds: p.metaMaxAds } : {}),
      ...(typeof p.metaCountry === "string" ? { metaCountry: p.metaCountry } : {}),
      ...(typeof p.metaSortBy === "string" ? { metaSortBy: p.metaSortBy } : {}),
      metaStartDate: typeof p.metaStartDate === "string" ? p.metaStartDate : base.metaStartDate,
      metaEndDate: typeof p.metaEndDate === "string" ? p.metaEndDate : base.metaEndDate,
      ...(typeof p.linkedinMaxAds === "number" ? { linkedinMaxAds: p.linkedinMaxAds } : {}),
      ...(typeof p.linkedinDateRange === "string" ? { linkedinDateRange: p.linkedinDateRange } : {}),
      ...(typeof p.linkedinCountryCode === "string" ? { linkedinCountryCode: p.linkedinCountryCode } : {}),
      ...(typeof p.tiktokMaxAds === "number" ? { tiktokMaxAds: p.tiktokMaxAds } : {}),
      ...(typeof p.tiktokStartDate === "string" ? { tiktokStartDate: p.tiktokStartDate } : {}),
      ...(typeof p.tiktokEndDate === "string" ? { tiktokEndDate: p.tiktokEndDate } : {}),
      ...(typeof p.microsoftMaxSearchResults === "number"
        ? { microsoftMaxSearchResults: p.microsoftMaxSearchResults }
        : {}),
      microsoftCountryCode:
        typeof p.microsoftCountryCode === "string"
          ? p.microsoftCountryCode
          : typeof p.microsoftCountryCodes === "string"
            ? p.microsoftCountryCodes.split(/[,;\s]+/)[0]?.replace(/\D/g, "") || "66"
            : "66",
      ...(typeof p.microsoftStartDate === "string" ? { microsoftStartDate: p.microsoftStartDate } : {}),
      ...(typeof p.microsoftEndDate === "string" ? { microsoftEndDate: p.microsoftEndDate } : {}),
      ...(typeof p.pinterestMaxResults === "number" ? { pinterestMaxResults: p.pinterestMaxResults } : {}),
      ...(typeof p.pinterestStartDate === "string" ? { pinterestStartDate: p.pinterestStartDate } : {}),
      ...(typeof p.pinterestEndDate === "string" ? { pinterestEndDate: p.pinterestEndDate } : {}),
      ...(typeof p.pinterestGender === "string" ? { pinterestGender: p.pinterestGender } : {}),
      ...(typeof p.pinterestAge === "string" ? { pinterestAge: p.pinterestAge } : {}),
      ...(typeof p.snapchatMaxItems === "number" ? { snapchatMaxItems: p.snapchatMaxItems } : {}),
      ...(typeof p.snapchatCountry === "string" ? { snapchatCountry: p.snapchatCountry } : {}),
      ...(typeof p.snapchatStartDate === "string" ? { snapchatStartDate: p.snapchatStartDate } : {}),
      ...(typeof p.snapchatEndDate === "string" ? { snapchatEndDate: p.snapchatEndDate } : {}),
    };
  } catch {
    return base;
  }
}

export function writeScrapeRequestFieldsToStorage(fields: ScrapeRequestFields): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeScrapeRequestFieldsCaps(fields)));
  } catch {
    /* ignore */
  }
}

/** First valid market from workspace settings (ISO2 or ALL). */
export function primaryWorkspaceAdMarketIso2(codes: string[] | undefined | null): string | null {
  if (!codes?.length) return null;
  for (const raw of codes) {
    const c = String(raw).trim().toUpperCase();
    if (!c) continue;
    if (c === "ALL" || c === "ANYWHERE") return "ALL";
    if (/^[A-Z]{2}$/.test(c)) return c;
  }
  return null;
}

/**
 * When the user sets ad markets on their workspace brand, those must drive Meta/Apify `metaCountry`,
 * not the global scrape-settings default (often US).
 */
export function mergeScrapeFieldsWithWorkspaceMarkets(
  base: ScrapeRequestFields,
  adMarketCountryCodes: string[] | undefined | null
): ScrapeRequestFields {
  const primary = primaryWorkspaceAdMarketIso2(adMarketCountryCodes);
  if (!primary) return base;
  return {
    ...base,
    metaCountry: primary,
  };
}
