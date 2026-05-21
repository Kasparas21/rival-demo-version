/**
 * Normalize user-pasted Meta / LinkedIn Ads Library URLs to stable forms without
 * embedded UI filters (countries, date ranges, etc.). Scrape settings apply those separately.
 */

const META_PAGE_ID_LEN = { min: 10, max: 22 } as const;

function normalizeHttpUrl(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/u, "")}`;
}

export function buildMetaAdLibraryUrl(viewAllPageId: string): string {
  const id = viewAllPageId.replace(/\D/g, "");
  return `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&view_all_page_id=${encodeURIComponent(id)}`;
}

/**
 * Meta Ad Library URL for post-onboarding workspace brand scrape — active ads only, full page search params.
 * Matches the public Ad Library share URL shape (search_type=page, sort by total impressions).
 */
export function buildWorkspaceBrandActiveMetaAdLibraryUrl(viewAllPageId: string): string {
  const id = viewAllPageId.replace(/\D/g, "");
  return (
    "https://www.facebook.com/ads/library/?" +
    "active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&" +
    "search_type=page&sort_data[direction]=desc&sort_data[mode]=total_impressions&" +
    `view_all_page_id=${encodeURIComponent(id)}`
  );
}

function isMetaAdsLibraryPath(low: string): boolean {
  return (
    (low.includes("facebook.com") || low.includes("fb.com") || low.includes("m.facebook.com")) &&
    low.includes("ads/library")
  );
}

function extractViewAllPageIdDigits(url: URL): string | undefined {
  const qpid = url.searchParams.get("view_all_page_id") ?? "";
  const digits = qpid.replace(/\D/g, "");
  if (digits.length >= META_PAGE_ID_LEN.min && digits.length <= META_PAGE_ID_LEN.max) return digits;
  return undefined;
}

function looksLikeBareMetaPageId(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const digitsOnly = t.replace(/\D/g, "");
  if (digitsOnly.length < META_PAGE_ID_LEN.min || digitsOnly.length > META_PAGE_ID_LEN.max) return undefined;
  if (!/^[\d\s-]+$/.test(t.replace(/[^\d\s-]/g, ""))) return undefined;
  return digitsOnly;
}

/**
 * When the input is a Meta Ad Library **page** URL (view_all_page_id) or a bare page id, returns a neutral library URL.
 * Single-ad links (`?id=` without view_all_page_id) and keyword searches return null.
 */
export function canonicalMetaAdsLibraryUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const low = t.toLowerCase();

  const bare = looksLikeBareMetaPageId(t);
  if (bare && !low.includes("facebook.") && !low.includes("fb.com") && !low.includes("fb.me")) {
    return buildMetaAdLibraryUrl(bare);
  }

  if (!isMetaAdsLibraryPath(low)) return null;

  try {
    const u = new URL(normalizeHttpUrl(t));
    const pageDigits = extractViewAllPageIdDigits(u);
    if (!pageDigits) return null;
    return buildMetaAdLibraryUrl(pageDigits);
  } catch {
    return null;
  }
}

export function extractMetaAdsLibraryPageId(raw: string): string | undefined {
  const canon = canonicalMetaAdsLibraryUrl(raw);
  if (!canon) return undefined;
  try {
    const id = new URL(canon).searchParams.get("view_all_page_id") ?? "";
    const d = id.replace(/\D/g, "");
    if (d.length >= META_PAGE_ID_LEN.min && d.length <= META_PAGE_ID_LEN.max) return d;
  } catch {
    /* ignore */
  }
  return undefined;
}

function linkedInCompanyCanonical(full: string): string | null {
  try {
    const u = new URL(normalizeHttpUrl(full));
    if (!/\.linkedin\.com$/i.test(u.hostname)) return null;
    const m = u.pathname.match(/\/company\/([^/?#]+)/i);
    if (!m?.[1]) return null;
    const slug = decodeURIComponent(m[1].replace(/\/$/, ""));
    if (!slug) return null;
    return `https://www.linkedin.com/company/${slug}`;
  } catch {
    return null;
  }
}

/**
 * Strips countries, dateOption, and other search noise from Ad Library URLs; keeps advertiser targeting only.
 * Company profile URLs are normalized to https://www.linkedin.com/company/{slug}.
 */
export function canonicalLinkedInAdLibraryUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const full = normalizeHttpUrl(t);
  const low = full.toLowerCase();
  if (!low.includes("linkedin.com")) return null;

  const company = linkedInCompanyCanonical(full);
  if (company) return company;

  if (/linkedin\.com\/ad-library\/detail\//i.test(full)) {
    try {
      const u = new URL(full);
      return `${u.origin}${u.pathname}`.replace(/\/+$/, "");
    } catch {
      return null;
    }
  }

  if (!/linkedin\.com\/ad-library\/search/i.test(full)) return null;

  try {
    const u = new URL(full);
    const next = new URL("https://www.linkedin.com/ad-library/search");

    const companyPairs: Array<{ idx: number; key: string; val: string }> = [];
    for (const [k, val] of u.searchParams.entries()) {
      const m = k.match(/^companyIds\[(\d+)]$/);
      if (m?.[1]) companyPairs.push({ idx: Number(m[1]), key: k, val });
    }
    companyPairs.sort((a, b) => a.idx - b.idx);

    if (companyPairs.length > 0) {
      for (const c of companyPairs) {
        next.searchParams.append(`companyIds[${c.idx}]`, c.val);
      }
      return next.toString();
    }

    const accountOwner = u.searchParams.get("accountOwner");
    if (accountOwner) {
      const owner = accountOwner.trim();
      if (owner) {
        next.searchParams.set("accountOwner", owner);
        /** LinkedIn scrapers perform better with both Company/advertiser filter and keyword */
        next.searchParams.set("keyword", owner);
      }
      return next.toString();
    }

    const keyword = u.searchParams.get("keyword");
    if (keyword) {
      next.searchParams.set("keyword", keyword);
      return next.toString();
    }

    return null;
  } catch {
    return null;
  }
}
