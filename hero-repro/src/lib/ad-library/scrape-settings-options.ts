/**
 * Shared dropdown options for Ads Library scrape settings (labels + API values).
 */

export type LabeledValue = { value: string; label: string };

/** Meta/Facebook Ad Library — country dropdown (`ALL` or ISO 3166-1 alpha-2). */
export const META_COUNTRY_OPTIONS: LabeledValue[] = [
  { value: "ALL", label: "All countries" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "AT", label: "Austria" },
  { value: "CH", label: "Switzerland" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "IE", label: "Ireland" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "GR", label: "Greece" },
  { value: "CZ", label: "Czechia" },
  { value: "RO", label: "Romania" },
  { value: "HU", label: "Hungary" },
  { value: "BG", label: "Bulgaria" },
  { value: "HR", label: "Croatia" },
  { value: "SK", label: "Slovakia" },
  { value: "SI", label: "Slovenia" },
  { value: "LT", label: "Lithuania" },
  { value: "LV", label: "Latvia" },
  { value: "EE", label: "Estonia" },
  { value: "LU", label: "Luxembourg" },
  { value: "MT", label: "Malta" },
  { value: "CY", label: "Cyprus" },
  { value: "IS", label: "Iceland" },
  { value: "LI", label: "Liechtenstein" },
  { value: "IN", label: "India" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "TW", label: "Taiwan" },
  { value: "SG", label: "Singapore" },
  { value: "NZ", label: "New Zealand" },
  { value: "ZA", label: "South Africa" },
  { value: "AR", label: "Argentina" },
  { value: "CO", label: "Colombia" },
];

/** LinkedIn actor — optional country filter (empty = all). Same ISO2 list without ALL at top. */
export const LINKEDIN_COUNTRY_OPTIONS: LabeledValue[] = [
  { value: "", label: "All countries" },
  ...META_COUNTRY_OPTIONS.filter((o) => o.value !== "ALL"),
];

/**
 * Microsoft Advertising Transparency actor — `countryCodes` enum (paired from Apify input schema).
 */
const MS_CODE = [
  "10", "14", "26", "49", "207", "51", "53", "61", "65", "66", "72", "76", "88", "92", "93", "104",
  "108", "109", "115", "129", "151", "152", "226", "165", "167", "170", "175", "89", "107", "139",
];
const MS_LABEL = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "Iceland",
  "Liechtenstein",
  "Norway",
];

export const MICROSOFT_MARKET_OPTIONS: LabeledValue[] = MS_CODE.map((value, i) => ({
  value,
  label: MS_LABEL[i] ?? value,
}));

const MS_CODE_SET = new Set(MS_CODE);

/** Single selected market → `countryCodes` array for Apify. */
export function microsoftMarketCodeToArray(code: string | undefined): string[] {
  const c = code?.trim().replace(/\D/g, "") || "";
  if (c && MS_CODE_SET.has(c)) return [c];
  return ["66"];
}
