import { inferAdMarketFromHostname } from "@/lib/onboarding/ad-markets";
import { snapchatEuSet } from "@/lib/apify/snapchat-ads";
import type { AdLibraryRegionPrefs } from "./ad-library-region-prefs";
import { ISO_3166_1_ALPHA2_CODES } from "./google-ads-regions";
import {
  DEFAULT_PINTEREST_ADS_COUNTRY,
  PINTEREST_ADS_ALLOWED_COUNTRY_CODES,
} from "./pinterest-regions";
import { META_COUNTRY_OPTIONS } from "./scrape-settings-options";
import { DEFAULT_TIKTOK_ADS_REGION, TIKTOK_ADS_LIBRARY_REGION_OPTIONS } from "./tiktok-regions";

const ISO_SET = new Set(ISO_3166_1_ALPHA2_CODES);

/**
 * Public suffix–style TLDs that are not reliable ccTLD country hints (plus org-like endings).
 */
const GENERIC_TLD = new Set([
  "com",
  "org",
  "net",
  "io",
  "co",
  "edu",
  "gov",
  "mil",
  "int",
  "eu",
  "info",
  "biz",
  "name",
  "app",
  "dev",
  "ai",
  "tv",
  "me",
  "ly",
  "to",
  "cc",
  "ws",
  "xyz",
  "online",
  "site",
  "shop",
  "tech",
  "cloud",
  "arpa",
  "localhost",
]);

const META_VALUES = new Set(META_COUNTRY_OPTIONS.map((o) => o.value));

const TIKTOK_REGION_SET = new Set(TIKTOK_ADS_LIBRARY_REGION_OPTIONS.map((o) => o.value));

function cleanHost(raw: string): string {
  return (
    raw
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      ?.trim() ?? ""
  );
}

/**
 * Best-effort ISO 3166-1 alpha-2 from the competitor site hostname (e.g. `*.lt` → LT, `*.de` → DE).
 */
export function inferIso2FromCompetitorDomain(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const host = cleanHost(raw).toLowerCase();
  const fromOnboarding = inferAdMarketFromHostname(host);
  if (fromOnboarding) return fromOnboarding;
  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  if (last === "uk") return "GB";
  if (last.length === 2 && /^[a-z]{2}$/.test(last) && !GENERIC_TLD.has(last)) {
    const code = last.toUpperCase();
    if (ISO_SET.has(code)) return code;
  }
  return null;
}

/** Defaults for ad-library region prefs when confirming a competitor (TLD-aware). */
export function inferAdLibraryRegionDefaults(rawDomain: string | null | undefined): AdLibraryRegionPrefs {
  const iso = inferIso2FromCompetitorDomain(rawDomain);
  const eu = snapchatEuSet();

  const metaCountry = iso && META_VALUES.has(iso) ? iso : "US";
  const googleRegion = iso ?? "anywhere";
  const tiktokRegion = iso && TIKTOK_REGION_SET.has(iso) ? iso : DEFAULT_TIKTOK_ADS_REGION;
  const pinterestCountry =
    iso && PINTEREST_ADS_ALLOWED_COUNTRY_CODES.has(iso) ? iso : DEFAULT_PINTEREST_ADS_COUNTRY;
  const linkedinCountryCode = iso ?? "";
  const snapchatCountry =
    iso && eu.has(iso) ? iso : "DE";

  return {
    metaCountry,
    googleRegion,
    tiktokRegion,
    pinterestCountry,
    linkedinCountryCode,
    snapchatCountry,
  };
}
