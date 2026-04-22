import {
  looksLikeUrl,
  toFullUrl,
  extractDomain,
  firstUrlLikeSegment,
  brandSlugFromDomain,
} from "@/lib/discovery";

export type TermKind = "url" | "brand" | "keyword";

export type TermHint = { value: string; kind: TermKind };

function titleCaseWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Turn dashboard input (raw string + optional typed chips) into stable labels and search context.
 */
export function interpretCompetitorQuery(
  rawQuery: string,
  hints?: TermHint[] | null
): {
  /** Best URL or domain to scrape first (https://…) */
  primaryLandingUrl: string | null;
  primaryDomain: string | null;
  primaryBrandName: string;
  searchPhrase: string;
  interpretationSummary: string;
  brandTokens: string[];
  keywordTokens: string[];
  urlTokens: string[];
} {
  const trimmed = rawQuery.trim();
  const hintsClean = (hints ?? []).filter((h) => h.value?.trim());

  let urlTokens: string[] = [];
  let brandTokens: string[] = [];
  let keywordTokens: string[] = [];

  if (hintsClean.length > 0) {
    for (const h of hintsClean) {
      const v = h.value.trim();
      if (h.kind === "url") urlTokens.push(v);
      else if (h.kind === "brand") brandTokens.push(v);
      else keywordTokens.push(v);
    }
  } else {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const urls = parts.filter((p) => looksLikeUrl(p));
    const nonUrls = parts.filter((p) => !looksLikeUrl(p));
    urlTokens = urls;
    if (nonUrls.length === 1) {
      brandTokens = [nonUrls[0]];
    } else if (nonUrls.length > 1) {
      brandTokens = [nonUrls[0]];
      keywordTokens = nonUrls.slice(1);
    }
  }

  let primaryLandingUrl: string | null = null;
  for (const u of urlTokens) {
    if (looksLikeUrl(u)) {
      primaryLandingUrl = toFullUrl(u);
      break;
    }
  }
  if (!primaryLandingUrl && trimmed) {
    const seg = firstUrlLikeSegment(trimmed);
    if (seg) primaryLandingUrl = toFullUrl(seg);
  }

  const primaryDomain = primaryLandingUrl
    ? extractDomain(primaryLandingUrl)
    : firstUrlLikeSegment(trimmed)
      ? extractDomain(toFullUrl(firstUrlLikeSegment(trimmed)!))
      : null;

  const slugFromDomain = primaryDomain ? brandSlugFromDomain(primaryDomain) : "";

  let primaryBrandName = "";
  if (brandTokens[0]) {
    primaryBrandName = titleCaseWords(brandTokens[0]);
  } else if (slugFromDomain) {
    primaryBrandName = titleCaseWords(slugFromDomain.replace(/[-_]/g, " "));
  } else {
    const firstWord = trimmed.split(/\s+/).find((w) => w && !looksLikeUrl(w));
    primaryBrandName = firstWord ? titleCaseWords(firstWord) : "This competitor";
  }

  const searchParts = new Set<string>();
  for (const b of brandTokens) searchParts.add(b.trim());
  for (const k of keywordTokens) searchParts.add(k.trim());
  if (slugFromDomain) searchParts.add(slugFromDomain);
  if (primaryDomain) searchParts.add(primaryDomain.replace(/^www\./, ""));
  const searchPhrase = [...searchParts].filter(Boolean).join(" ").slice(0, 160) || trimmed;

  const nUrl = urlTokens.length;
  const nBrand = brandTokens.length;
  const nKey = keywordTokens.length;
  const bits: string[] = [];
  if (nBrand) bits.push(`${nBrand} brand name${nBrand > 1 ? "s" : ""}`);
  if (nUrl) bits.push(`${nUrl} URL/domain${nUrl > 1 ? "s" : ""}`);
  if (nKey) bits.push(`${nKey} keyword${nKey > 1 ? "s" : ""}`);
  const interpretationSummary =
    hintsClean.length > 0 && bits.length > 0
      ? `You labeled ${bits.join(", ")}. We’re using “${primaryBrandName}” as the company name${
          primaryDomain ? ` and “${primaryDomain.replace(/^www\./, "")}” as their site` : ""
        } for lookups.`
      : primaryDomain
        ? `From your search we’re treating “${primaryBrandName}” (${primaryDomain.replace(/^www\./, "")}) as the competitor.`
        : `We’re researching “${primaryBrandName}” from what you entered.`;

  return {
    primaryLandingUrl,
    primaryDomain,
    primaryBrandName,
    searchPhrase,
    interpretationSummary,
    brandTokens,
    keywordTokens,
    urlTokens,
  };
}
