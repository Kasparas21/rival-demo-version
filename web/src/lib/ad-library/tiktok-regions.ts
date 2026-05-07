/**
 * TikTok Ads Library Apify actor (`data_xplorer/tiktok-ads-library-pay-per-event`)
 * allowed `region` values (API validation).
 */
export const TIKTOK_ADS_LIBRARY_REGION_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "AT", label: "Austria" },
  { value: "BE", label: "Belgium" },
  { value: "BG", label: "Bulgaria" },
  { value: "HR", label: "Croatia" },
  { value: "CY", label: "Cyprus" },
  { value: "CZ", label: "Czechia" },
  { value: "DK", label: "Denmark" },
  { value: "EE", label: "Estonia" },
  { value: "FI", label: "Finland" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "GR", label: "Greece" },
  { value: "HU", label: "Hungary" },
  { value: "IS", label: "Iceland" },
  { value: "IE", label: "Ireland" },
  { value: "IT", label: "Italy" },
  { value: "LV", label: "Latvia" },
  { value: "LI", label: "Liechtenstein" },
  { value: "LT", label: "Lithuania" },
  { value: "LU", label: "Luxembourg" },
  { value: "MT", label: "Malta" },
  { value: "NL", label: "Netherlands" },
  { value: "NO", label: "Norway" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "RO", label: "Romania" },
  { value: "SK", label: "Slovakia" },
  { value: "SI", label: "Slovenia" },
  { value: "ES", label: "Spain" },
  { value: "SE", label: "Sweden" },
  { value: "CH", label: "Switzerland" },
  { value: "TR", label: "Türkiye" },
  { value: "GB", label: "United Kingdom" },
] as const;

const ALLOWED = new Set(TIKTOK_ADS_LIBRARY_REGION_OPTIONS.map((o) => o.value));

/** Default when TLD inference or storage does not match an actor region (US not supported by this actor). */
export const DEFAULT_TIKTOK_ADS_REGION = "GB";

/** Coerce user/API input to a valid actor region. Legacy `all` maps to {@link DEFAULT_TIKTOK_ADS_REGION}. */
export function normalizeTikTokAdsRegion(input: string | undefined): string {
  const t = input?.trim();
  if (t === "all") return DEFAULT_TIKTOK_ADS_REGION;
  if (t && ALLOWED.has(t)) return t;
  return DEFAULT_TIKTOK_ADS_REGION;
}
