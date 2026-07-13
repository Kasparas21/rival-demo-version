/**
 * Shared dropdown options for Ads Library scrape settings (labels + API values).
 */

import { ISO_3166_1_ALPHA2_CODES } from "@/lib/ad-library/google-ads-regions";

export type LabeledValue = { value: string; label: string };

/** Build Meta/Facebook Ad Library country options (`ALL` or any ISO 3166-1 alpha-2). */
export function buildMetaCountryOptions(): LabeledValue[] {
  const dn = new Intl.DisplayNames(["en"], { type: "region" });
  const rest = ISO_3166_1_ALPHA2_CODES.map((code) => ({
    value: code,
    label: `${dn.of(code) ?? code} (${code})`,
  })).sort((a, b) => a.label.localeCompare(b.label, "en"));
  return [{ value: "ALL", label: "All countries" }, ...rest];
}

/**
 * Meta/Facebook Ad Library — country filter passed to the Ad Library URL (`country=XX` or `ALL`).
 * Uses the full ISO list (same as Google Ads region picker) — not a hand-picked subset.
 */
export const META_COUNTRY_OPTIONS: LabeledValue[] = buildMetaCountryOptions();

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
