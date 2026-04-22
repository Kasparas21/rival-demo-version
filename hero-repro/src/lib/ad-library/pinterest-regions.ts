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

export const DEFAULT_PINTEREST_ADS_COUNTRY = "DE";

export type PinterestCountryOption = { value: string; label: string };

/**
 * Full list of actor-supported countries: Germany first (default), then A–Z by English name.
 */
export const PINTEREST_ADS_COUNTRY_OPTIONS: PinterestCountryOption[] = (() => {
  const de = PINTEREST_MARKETS.find((m) => m.code === "DE");
  const rest = PINTEREST_MARKETS.filter((m) => m.code !== "DE").sort((a, b) =>
    a.name.localeCompare(b.name, "en")
  );
  const ordered = de ? [de, ...rest] : [...PINTEREST_MARKETS];
  return ordered.map((m) => ({ value: m.code, label: `${m.name} (${m.code})` }));
})();

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
