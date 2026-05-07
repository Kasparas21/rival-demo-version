import { googleFaviconUrlForDomain } from "@/lib/discovery";
import {
  coerceSidebarCompetitorUrlHost,
  findMatchingCompetitorIndex,
  hoistLogoOntoRow,
  loadSidebarCompetitors,
  normalizeCompetitorSlug,
  type SidebarCompetitor,
} from "@/lib/sidebar-competitors";

const BRAND_FALLBACK_ACCENT = "#6366f1";

export type CompetitorPageBrand = {
  name: string;
  domain: string;
  logoUrl: string;
  handle: string;
  color: string;
};

function brandFromSidebarRow(row: SidebarCompetitor): CompetitorPageBrand {
  const domain =
    row.brand?.domain?.trim() ||
    normalizeCompetitorSlug(coerceSidebarCompetitorUrlHost(row)) ||
    normalizeCompetitorSlug(row.slug);
  const name = row.brand?.name?.trim() || row.name?.trim() || domain.split(".")[0] || domain;
  const handle = domain.split(".")[0] ?? name.toLowerCase().replace(/\s+/g, "");
  const hoisted = hoistLogoOntoRow(row);
  const logoUrl =
    hoisted.logoUrl?.trim() ||
    row.brand?.logoUrl?.trim() ||
    googleFaviconUrlForDomain(domain);
  return {
    name,
    domain,
    logoUrl,
    handle,
    color: BRAND_FALLBACK_ACCENT,
  };
}

function brandFromHostnameFallback(host: string): CompetitorPageBrand {
  const domain = normalizeCompetitorSlug(host);
  const handle = domain.split(".")[0] ?? domain;
  const name = handle.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  return {
    name: name || domain,
    domain,
    handle,
    logoUrl: googleFaviconUrlForDomain(domain),
    color: BRAND_FALLBACK_ACCENT,
  };
}

export function parseBrandFromUrlParam(brandParam: string | null): CompetitorPageBrand | null {
  if (!brandParam) return null;
  try {
    const parsed = JSON.parse(brandParam) as { name?: string; domain?: string; logoUrl?: string };
    if (parsed?.name && parsed?.domain) {
      const handle = parsed.domain.split(".")[0] || parsed.name.toLowerCase().replace(/\s+/g, "");
      const logoUrl = parsed.logoUrl?.trim() || googleFaviconUrlForDomain(parsed.domain);
      return {
        name: parsed.name,
        domain: normalizeCompetitorSlug(parsed.domain),
        logoUrl,
        handle,
        color: BRAND_FALLBACK_ACCENT,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function findSidebarRowForHost(
  pathCanonicalHost: string,
  /** When provided (including `[]`), skips `localStorage` — use `[]` on SSR + first client paint for hydration. */
  sidebarSnapshot?: SidebarCompetitor[]
): SidebarCompetitor | undefined {
  const list = sidebarSnapshot !== undefined ? sidebarSnapshot : loadSidebarCompetitors();
  const target = normalizeCompetitorSlug(pathCanonicalHost);
  for (const c of list) {
    const host = normalizeCompetitorSlug(coerceSidebarCompetitorUrlHost(c));
    if (host && host === target) return c;
    if (c.brand?.domain && normalizeCompetitorSlug(c.brand.domain) === target) return c;
    if (normalizeCompetitorSlug(c.slug) === target) return c;
  }
  const idx = findMatchingCompetitorIndex(list, pathCanonicalHost, pathCanonicalHost);
  if (idx >= 0) return list[idx];
  return undefined;
}

export type UrlOverrideParams = {
  brandParam: string | null;
  idsParam: string | null;
  channelsParam: string | null;
  /** Raw `confirmed` query: `"1"` | other | null (absent) */
  confirmedParam: string | null;
};

export function resolveCompetitorViewFromSidebar(
  pathCanonicalHost: string,
  overrides: UrlOverrideParams,
  /**
   * Pass `[]` during SSR and on the first client render so output matches the server (no `localStorage` yet).
   * After mount, pass `loadSidebarCompetitors()` result.
   */
  sidebarSnapshot?: SidebarCompetitor[]
): {
  brand: CompetitorPageBrand;
  platformIds: Record<string, string> | null;
  channelsParam: string;
  isConfirmed: boolean;
} {
  const row = findSidebarRowForHost(pathCanonicalHost, sidebarSnapshot);

  const brandFromQuery = parseBrandFromUrlParam(overrides.brandParam);
  const brand: CompetitorPageBrand =
    brandFromQuery ?? (row ? brandFromSidebarRow(row) : brandFromHostnameFallback(pathCanonicalHost));

  let platformIds: Record<string, string> | null = null;
  if (overrides.idsParam?.trim()) {
    try {
      platformIds = JSON.parse(overrides.idsParam) as Record<string, string>;
    } catch {
      platformIds = null;
    }
  }
  if (!platformIds && row?.libraryContext?.ids && Object.keys(row.libraryContext.ids).length > 0) {
    platformIds = { ...row.libraryContext.ids };
  }

  let channelsParam = overrides.channelsParam ?? "";
  if (!channelsParam.trim() && row?.libraryContext?.channels && row.libraryContext.channels.length > 0) {
    channelsParam = row.libraryContext.channels.join(",");
  }

  let isConfirmed = false;
  if (overrides.confirmedParam === "1") isConfirmed = true;
  else if (overrides.confirmedParam === "0") isConfirmed = false;
  else if (row?.libraryContext?.confirmed === true) isConfirmed = true;

  return { brand, platformIds, channelsParam, isConfirmed };
}
