/**
 * Where Rival searches / scrapes competitor ads during onboarding.
 * EU-27 + United Kingdom + United States (ISO 3166-1 alpha-2).
 */
export const ONBOARDING_AD_MARKETS: ReadonlyArray<{ code: string; label: string; shortTag: string }> = [
  { code: "US", label: "United States", shortTag: "USA" },
  { code: "GB", label: "United Kingdom", shortTag: "UK" },
  { code: "AT", label: "Austria", shortTag: "AT" },
  { code: "BE", label: "Belgium", shortTag: "BE" },
  { code: "BG", label: "Bulgaria", shortTag: "BG" },
  { code: "HR", label: "Croatia", shortTag: "HR" },
  { code: "CY", label: "Cyprus", shortTag: "CY" },
  { code: "CZ", label: "Czechia", shortTag: "CZ" },
  { code: "DK", label: "Denmark", shortTag: "DK" },
  { code: "EE", label: "Estonia", shortTag: "EE" },
  { code: "FI", label: "Finland", shortTag: "FI" },
  { code: "FR", label: "France", shortTag: "FR" },
  { code: "DE", label: "Germany", shortTag: "DE" },
  { code: "GR", label: "Greece", shortTag: "GR" },
  { code: "HU", label: "Hungary", shortTag: "HU" },
  { code: "IE", label: "Ireland", shortTag: "IE" },
  { code: "IT", label: "Italy", shortTag: "IT" },
  { code: "LV", label: "Latvia", shortTag: "LV" },
  { code: "LT", label: "Lithuania", shortTag: "LT" },
  { code: "LU", label: "Luxembourg", shortTag: "LU" },
  { code: "MT", label: "Malta", shortTag: "MT" },
  { code: "NL", label: "Netherlands", shortTag: "NL" },
  { code: "PL", label: "Poland", shortTag: "PL" },
  { code: "PT", label: "Portugal", shortTag: "PT" },
  { code: "RO", label: "Romania", shortTag: "RO" },
  { code: "SK", label: "Slovakia", shortTag: "SK" },
  { code: "SI", label: "Slovenia", shortTag: "SI" },
  { code: "ES", label: "Spain", shortTag: "ES" },
  { code: "SE", label: "Sweden", shortTag: "SE" },
] as const;

export const ONBOARDING_AD_MARKET_CODES = ONBOARDING_AD_MARKETS.map((m) => m.code);

export const ONBOARDING_AD_MARKET_CODE_SET: ReadonlySet<string> = new Set(ONBOARDING_AD_MARKET_CODES);

/** Map ccTLD (last DNS label when it is a country) → ISO alpha-2 for supported markets only. */
export function inferAdMarketFromHostname(hostname: string): string | null {
  const h = hostname.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
  if (!h) return null;
  const parts = h.split(".").filter(Boolean);
  if (parts.length < 2) return null;

  const last = parts[parts.length - 1];
  // .uk / *.co.uk / *.gov.uk …
  if (last === "uk") return "GB";
  if (last === "us") return "US";
  if (last.length === 2 && /^[a-z]{2}$/.test(last)) {
    const code = last.toUpperCase();
    return ONBOARDING_AD_MARKET_CODE_SET.has(code) ? code : null;
  }
  return null;
}

/** Regional indicator pair → flag emoji (falls back if invalid) */
export function countryFlagEmoji(iso2: string): string {
  const cc = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65) + String.fromCodePoint(A + cc.charCodeAt(1) - 65);
}

export const DEFAULT_ONBOARDING_AD_MARKETS: string[] = ["US"];
