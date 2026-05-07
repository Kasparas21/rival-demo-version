import {
  GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT,
  GOOGLE_ADS_LIBRARY_MAX_ITEMS,
} from "./constants";

/**
 * Google Ads Transparency (Apify) — `region` is `anywhere` (all countries) or ISO 3166-1 alpha-2.
 * @see Apify actor input: `region` default `"anywhere"`.
 */

/** ISO 3166-1 alpha-2 codes (249); used for validation + dropdown. */
export const ISO_3166_1_ALPHA2_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    /\s+/
  );

const ISO_SET = new Set(ISO_3166_1_ALPHA2_CODES);

export const DEFAULT_GOOGLE_ADS_REGION = "anywhere";

export function normalizeGoogleAdsRegion(input: string | undefined): string {
  const t = input?.trim();
  if (!t) return DEFAULT_GOOGLE_ADS_REGION;
  if (/^anywhere$/i.test(t)) return "anywhere";
  const u = t.toUpperCase();
  if (u.length === 2 && ISO_SET.has(u)) return u;
  return DEFAULT_GOOGLE_ADS_REGION;
}

/** Labels for `<select>` — expensive; memoize in client components (`useMemo(..., [])`). */
export function buildGoogleAdsRegionOptions(): { value: string; label: string }[] {
  const dn = new Intl.DisplayNames(["en"], { type: "region" });
  const rest = ISO_3166_1_ALPHA2_CODES.map((code) => ({
    value: code,
    label: `${dn.of(code) ?? code} (${code})`,
  })).sort((a, b) => a.label.localeCompare(b.label, "en"));
  return [{ value: "anywhere", label: "All countries" }, ...rest];
}

export function normalizeGoogleAdsResultsLimit(input: unknown): number {
  const n = typeof input === "number" ? input : typeof input === "string" ? parseInt(input, 10) : NaN;
  if (!Number.isFinite(n)) return GOOGLE_ADS_LIBRARY_DEFAULT_RESULTS_LIMIT;
  const floored = Math.floor(n);
  return Math.max(1, Math.min(floored, GOOGLE_ADS_LIBRARY_MAX_ITEMS));
}
