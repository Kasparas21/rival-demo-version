/**
 * Pinterest Ad Transparency (DSA) — supported markets for zadexinho/pinterest-ads-scraper:
 * 29 countries (EU-27 + Brazil + Turkey). US / global transparency is not available via this source.
 */
const PINTEREST_MARKETS: readonly { code: string; name: string }[] = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "BR", name: "Brazil" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "TR", name: "Turkey" },
] as const;

const PINTEREST_ADS_ALLOWED_COUNTRIES = new Set(PINTEREST_MARKETS.map((m) => m.code));

/** Actor-supported country codes (for TLD inference and validation). */
export const PINTEREST_ADS_ALLOWED_COUNTRY_CODES: ReadonlySet<string> = PINTEREST_ADS_ALLOWED_COUNTRIES;

export const DEFAULT_PINTEREST_ADS_COUNTRY = "DE";

export type PinterestCountryOption = { value: string; label: string };

/**
 * Full list of actor-supported countries — ISO 3166-1 alpha-2 A–Z (same ordering as other platform chip rows).
 */
export const PINTEREST_ADS_COUNTRY_OPTIONS: PinterestCountryOption[] = [...PINTEREST_MARKETS]
  .slice()
  .sort((a, b) => a.code.localeCompare(b.code, "en"))
  .map((m) => ({ value: m.code, label: `${m.name} (${m.code})` }));

export function normalizePinterestAdsCountry(input: string | undefined): string {
  const fromEnv = process.env.PINTEREST_ADS_COUNTRY?.trim().toUpperCase();
  const fallback =
    fromEnv && PINTEREST_ADS_ALLOWED_COUNTRIES.has(fromEnv)
      ? fromEnv
      : DEFAULT_PINTEREST_ADS_COUNTRY;
  const raw = input?.trim().toUpperCase();
  if (raw && PINTEREST_ADS_ALLOWED_COUNTRIES.has(raw)) return raw;
  return fallback;
}
