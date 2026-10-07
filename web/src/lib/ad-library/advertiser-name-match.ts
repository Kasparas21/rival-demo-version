/**
 * Strict advertiser ↔ brand match for ad libraries that search by name (LinkedIn, TikTok) and return
 * lookalikes: "NIKE Retail B.V." matches Nike, "Nikenza Viceconte" and "Unisport A/S" don't.
 */

function words(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Words allowed after the brand in an advertiser's own entity name: legal forms, "retail"/"group"-style
 * entity words and markets. Anything else ("Nike DEI Workplace Discrimination") is someone else's ad.
 */
const ENTITY_SUFFIX_WORDS = new Set([
  "inc", "incorporated", "llc", "ltd", "limited", "plc", "corp", "corporation", "co", "company", "gmbh", "ag", "sa",
  "sas", "sarl", "srl", "spa", "bv", "b", "v", "nv", "ab", "as", "aps", "oy", "kft", "sro", "sp", "z", "o", "pty",
  "pte", "kk", "lp", "llp", "the", "and", "retail", "group", "holding", "holdings", "international", "global",
  "official", "store", "stores", "shop", "online", "brand", "brands", "europe", "eu", "emea", "uk", "us", "usa",
  "america", "germany", "deutschland", "france", "italia", "italy", "espana", "spain", "nederland", "netherlands",
  "benelux", "nordic", "nordics", "japan", "canada", "australia", "india", "de", "fr", "it", "es", "nl", "be", "at",
  "ch", "se", "dk", "no", "fi", "pl", "pt", "ie", "gb", "au", "ca", "jp",
]);

/**
 * True when the advertiser name is the brand (word-aligned, spacing-insensitive) followed only by
 * company-style words: "NIKE Retail B.V." and "Rothy's Inc" match; "Nikenza Viceconte" and "Unisport A/S" don't.
 */
export function advertiserNameMatchesBrand(advertiser: string | null | undefined, candidates: readonly string[]): boolean {
  const advertiserWords = words(advertiser ?? "");
  if (advertiserWords.length === 0) return false;

  return candidates.some((candidate) => {
    const brand = words(candidate).join("");
    if (brand.length < 2) return false;
    let joined = "";
    for (let i = 0; i < advertiserWords.length; i++) {
      joined += advertiserWords[i];
      if (joined === brand) return advertiserWords.slice(i + 1).every((w) => ENTITY_SUFFIX_WORDS.has(w));
      if (joined.length >= brand.length) return false;
    }
    return false;
  });
}

/** Brand names to match against: display name, domain label, LinkedIn slug, etc. Blank and generic ones are dropped. */
export function brandMatchCandidates(...values: Array<string | null | undefined>): string[] {
  const out = new Set<string>();
  for (const v of values) {
    const t = v?.trim();
    if (!t || /^(admin|owner|user|test|competitor|advertiser|brand|marketing)$/i.test(t)) continue;
    out.add(t);
  }
  return [...out];
}

/** "nike.com" / "www.rothys.com" → "nike" / "rothys". */
export function domainBrandLabel(domain: string | null | undefined): string | null {
  const host = domain?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  if (!host) return null;
  return host.split(".")[0] || null;
}
