import Firecrawl from "@mendable/firecrawl-js";
import type { Document, ScrapeOptions } from "@mendable/firecrawl-js";
import type { ChannelId } from "@/components/channel-picker-modal";
import {
  looksLikeUrl,
  toFullUrl,
  extractDomain,
  parseSocialLinks,
  extractLinksFromContent,
  FALLBACK_SEARCH_KEYS,
  firstUrlLikeSegment,
  landingUrlVariants,
  brandSlugFromDomain,
  collectFacebookPageUrls,
  expandFacebookUrlsForScrape,
  extractFacebookPageIdFromHtml,
  parseSocialLinksFromHits,
  googleFaviconUrlForDomain,
  pickPreviewUrlFromHits,
  normalizeSocialUrlCandidate,
  type PlatformIdentifier,
  type SearchHit,
} from "@/lib/discovery";
import { extractPinterestHandleFromUrlOrString } from "@/lib/ad-library/pinterest-handle";
import { buildMetaAdLibraryUrl } from "@/lib/ad-library/canonical-library-url";
import { linkedInAdLibraryUrlHasAdvertiserTargeting } from "@/lib/linkedin-ad-library-url";

export const DISCOVER_FIRECRAWL_TIMEOUT_MS = 55_000;

/** Pull footer/header socials that only appear as raw `<a href>`. Matches onboarding homepage scrape. */
function extractHrefUrlsFromHtml(html: string | undefined): string[] {
  if (!html?.trim()) return [];
  const out: string[] = [];
  const re = /\bhref\s*=\s*["']([^"'\\]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const v = m[1]?.trim();
    if (!v) continue;
    const low = v.toLowerCase();
    if (
      low.startsWith("javascript:") ||
      low.startsWith("mailto:") ||
      low.startsWith("tel:") ||
      low.startsWith("data:") ||
      low === "#" ||
      low.startsWith("#")
    ) {
      continue;
    }
    out.push(v);
  }
  return out;
}

export function createDiscoverFirecrawlClient(): InstanceType<typeof Firecrawl> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }
  return new Firecrawl({ apiKey, timeoutMs: DISCOVER_FIRECRAWL_TIMEOUT_MS });
}

export async function resolveLandingUrl(
  app: InstanceType<typeof Firecrawl>,
  query: string,
  preferredUrl?: string | null
): Promise<string> {
  const pref = preferredUrl?.trim();
  if (pref && looksLikeUrl(pref)) {
    return toFullUrl(pref);
  }
  const trimmed = query.trim();
  if (looksLikeUrl(trimmed)) {
    return toFullUrl(trimmed);
  }
  const segment = firstUrlLikeSegment(trimmed);
  if (segment) {
    return toFullUrl(segment);
  }
  const searchRes = await app.search(`"${trimmed}" official site`, {
    limit: 3,
    sources: [{ type: "web" }],
  });
  const first = searchRes.web?.[0];
  if (first && "url" in first && typeof first.url === "string") {
    return first.url;
  }
  throw new Error("Could not find official website");
}

function webHitsToSearchHits(
  web: Array<Record<string, unknown> | { url?: string; title?: string }>
): SearchHit[] {
  const out: SearchHit[] = [];
  for (const w of web) {
    if ("url" in w && typeof w.url === "string") {
      out.push({
        url: w.url,
        title: "title" in w && typeof w.title === "string" ? w.title : undefined,
      });
    }
  }
  return out;
}

export function documentToScrapeResult(
  doc: Document,
  resolvedUrl: string,
  opts?: { includeHtmlHrefMining?: boolean }
): {
  discoveredIds: Partial<PlatformIdentifier>;
  logoUrl?: string;
  domain: string;
  links: string[];
} {
  const domain = extractDomain(resolvedUrl);
  const pageUrl = resolvedUrl.split("#")[0];
  const hrefFromHtml =
    opts?.includeHtmlHrefMining && (doc.rawHtml || doc.html)
      ? extractHrefUrlsFromHtml(doc.rawHtml || doc.html || "").map((raw) => {
          const t = raw.trim();
          if (!t) return t;
          try {
            if (/^https?:\/\//i.test(t)) return normalizeSocialUrlCandidate(t);
            if (t.startsWith("//")) return normalizeSocialUrlCandidate(`https:${t}`);
            if (t.startsWith("/")) return normalizeSocialUrlCandidate(new URL(t, pageUrl).toString());
            if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}\//i.test(t))
              return normalizeSocialUrlCandidate(`https://${t}`);
          } catch {
            /* skip */
          }
          return normalizeSocialUrlCandidate(t);
        })
      : [];
  const links: string[] = [
    ...(doc.links ?? []),
    ...extractLinksFromContent(doc.markdown ?? ""),
    ...hrefFromHtml.filter(Boolean),
  ];
  const discoveredIds = parseSocialLinks(links);
  discoveredIds.google = domain;
  const logoUrl =
    doc.metadata?.ogImage ??
    doc.metadata?.favicon ??
    (doc.metadata as { logo?: string })?.logo;
  return { discoveredIds, logoUrl: logoUrl || undefined, domain, links };
}

export async function scrapeWithFallbacks(
  app: InstanceType<typeof Firecrawl>,
  landingUrl: string,
  opts?: { enrichLinksFromPageHtml?: boolean }
): Promise<ReturnType<typeof documentToScrapeResult> | null> {
  const urls = landingUrlVariants(landingUrl);
  const baseFormats: ScrapeOptions["formats"] = opts?.enrichLinksFromPageHtml
    ? [{ type: "markdown" }, { type: "links" }, { type: "rawHtml" }]
    : [{ type: "markdown" }, { type: "links" }];

  const attempts: ScrapeOptions[] = [
    { formats: baseFormats, onlyMainContent: false, fastMode: true, timeout: 22_000 },
    { formats: baseFormats, onlyMainContent: false, fastMode: false, timeout: 28_000, waitFor: 1500 },
    {
      formats: baseFormats,
      onlyMainContent: false,
      fastMode: false,
      timeout: 32_000,
      waitFor: 2500,
      proxy: "stealth",
    },
    { formats: baseFormats, onlyMainContent: false, fastMode: false, timeout: 36_000, proxy: "auto" },
  ];

  const mine = Boolean(opts?.enrichLinksFromPageHtml);

  for (const url of urls) {
    for (const attemptOpts of attempts) {
      try {
        const doc = await app.scrape(url, attemptOpts);
        const md = doc.markdown?.trim().length ?? 0;
        const linkCount = doc.links?.length ?? 0;
        const hasMeta =
          Boolean(doc.metadata?.ogTitle) ||
          Boolean(doc.metadata?.ogImage) ||
          Boolean(doc.metadata?.description);
        if (md > 80 || linkCount > 0 || hasMeta) {
          return documentToScrapeResult(doc, url, { includeHtmlHrefMining: mine });
        }
      } catch {
        /* next */
      }
    }
  }
  return null;
}

export async function tryResolveMetaPageIdFromFacebookUrls(
  app: InstanceType<typeof Firecrawl>,
  hits: SearchHit[],
  existingMeta?: string
): Promise<string | undefined> {
  if (existingMeta && /^\d{10,22}$/.test(existingMeta.replace(/\D/g, ""))) {
    const digits = existingMeta.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 22) return digits;
  }
  const urls = expandFacebookUrlsForScrape(collectFacebookPageUrls(hits));
  const htmlFormats: ScrapeOptions["formats"] = [{ type: "rawHtml" }];

  for (const fbUrl of urls) {
    for (const proxy of [undefined, "stealth" as const, "auto" as const]) {
      try {
        const doc = await app.scrape(fbUrl, {
          formats: htmlFormats,
          timeout: 20_000,
          waitFor: 1000,
          ...(proxy ? { proxy } : {}),
        });
        const html = doc.rawHtml || doc.html || "";
        const id = extractFacebookPageIdFromHtml(html);
        if (id && id.length >= 15) return id;
        if (id && id.length >= 10) return id;
      } catch {
        /* try next */
      }
    }
  }
  return undefined;
}

export { buildMetaAdLibraryUrl };

export function isMetaAdLibraryUrl(url: string): boolean {
  const low = url.toLowerCase();
  return (low.includes("facebook.com") || low.includes("fb.com")) && low.includes("ads/library");
}

export function normalizeMetaNumericPageId(meta: string | undefined): string | undefined {
  if (!meta?.trim()) return undefined;
  const digits = meta.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 22) return digits;
  return undefined;
}

/** Prefer Ad Library URL when numeric Page ID is known — never populate vanity facebook.com paths as canonical. */
export function applyDiscoveredMetaPresentation(
  discoveredIds: Partial<PlatformIdentifier>,
  _metaHits: SearchHit[],
  _scrapedDomain: string
): Partial<PlatformIdentifier> {
  const digits = normalizeMetaNumericPageId(String(discoveredIds.meta ?? ""));
  if (digits) {
    return {
      ...discoveredIds,
      meta: digits,
      metaPageUrl: buildMetaAdLibraryUrl(digits),
    };
  }
  const next: Partial<PlatformIdentifier> = { ...discoveredIds };
  delete next.metaPageUrl;
  if (next.meta != null && !normalizeMetaNumericPageId(String(next.meta))) {
    delete next.meta;
  }
  return next;
}

export function extractLinkedInCompanyIdFromHtml(html: string): string | undefined {
  if (!html?.trim() || html.length < 120) return undefined;
  const patterns: RegExp[] = [
    /"companyId"\s*:\s*"?(\d{6,20})"?/,
    /urn:li:company:(\d{6,20})\b/,
    /linkedin\.com\/company\/(\d{6,20})(?:\/|"|'|\?|#|$)/i,
    /\/company\/(\d{6,20})(?:\/|"|'|\?|#|\s)/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1] && /^\d{6,20}$/.test(m[1])) return m[1];
  }
  return undefined;
}

export function isLinkedInAdLibraryCompanyIdsUrl(url: string): boolean {
  return linkedInAdLibraryUrlHasAdvertiserTargeting(url);
}

export function collectLinkedInCompanyPageUrls(
  hits: SearchHit[],
  scrapeLinks: string[],
  seedLinkedin?: string
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const low = t.toLowerCase();
    if (!/linkedin\.com\/company\//i.test(low)) return;
    if (/linkedin\.com\/ad-library/i.test(low)) return;
    try {
      const u = new URL(normalizeSocialUrlCandidate(t));
      const m = u.pathname.match(/\/company\/([^/]+)/i);
      if (!m?.[1]) return;
      const segment = decodeURIComponent(m[1].replace(/\/$/, ""));
      if (!segment) return;
      const canonical = `https://www.linkedin.com/company/${segment}`;
      if (!seen.has(canonical)) {
        seen.add(canonical);
        out.push(canonical);
      }
    } catch {
      /* skip */
    }
  };
  for (const h of hits) add(h.url);
  for (const s of scrapeLinks) add(s);
  if (seedLinkedin?.trim()) add(seedLinkedin.trim());
  return out.slice(0, 8);
}

export function buildLinkedInAdLibraryCompanySearchUrl(companyNumericId: string): string {
  const id = companyNumericId.replace(/\D/g, "");
  const params = new URLSearchParams();
  params.append("companyIds[0]", id);
  return `https://www.linkedin.com/ad-library/search?${params.toString()}`;
}

export async function tryResolveLinkedInCompanyIdFromUrls(
  app: InstanceType<typeof Firecrawl>,
  urls: string[]
): Promise<string | undefined> {
  const htmlFormats: ScrapeOptions["formats"] = [{ type: "rawHtml" }];
  for (const liUrl of urls.slice(0, 6)) {
    for (const proxy of [undefined, "stealth" as const, "auto" as const]) {
      try {
        const doc = await app.scrape(liUrl, {
          formats: htmlFormats,
          timeout: 20_000,
          waitFor: 1000,
          ...(proxy ? { proxy } : {}),
        });
        const html = doc.rawHtml || doc.html || "";
        const id = extractLinkedInCompanyIdFromHtml(html);
        if (id) return id;
      } catch {
        /* try next */
      }
    }
  }
  return undefined;
}

export async function finalizeLinkedInDiscovery(
  app: InstanceType<typeof Firecrawl> | null,
  discoveredIds: Partial<PlatformIdentifier>,
  metaHits: SearchHit[],
  scrapeLinks: string[],
  linkedinChannelSelected: boolean
): Promise<Partial<PlatformIdentifier>> {
  if (!linkedinChannelSelected) return discoveredIds;
  const cur = discoveredIds.linkedin?.trim();
  if (cur && isLinkedInAdLibraryCompanyIdsUrl(cur)) return discoveredIds;

  const urls = collectLinkedInCompanyPageUrls(metaHits, scrapeLinks, cur);
  if (!app || urls.length === 0) {
    if (cur && /linkedin\.com\/company\//i.test(cur)) {
      const { linkedin: _drop, ...rest } = discoveredIds;
      return rest;
    }
    return discoveredIds;
  }

  const id = await tryResolveLinkedInCompanyIdFromUrls(app, urls);
  if (id) return { ...discoveredIds, linkedin: buildLinkedInAdLibraryCompanySearchUrl(id) };

  const { linkedin: _drop, ...rest } = discoveredIds;
  return rest;
}

/** Keyword suggestions for TikTok / Snapchat / Pinterest (deduped, priority order). */
export function buildRecommendedKeywords(ctx: {
  brandName: string;
  domain: string;
  discoveredIds?: Partial<PlatformIdentifier>;
}): string[] {
  const out: string[] = [];
  const seenLower = new Set<string>();
  const push = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seenLower.has(k)) return;
    seenLower.add(k);
    out.push(t);
  };

  push(ctx.brandName.split("/")[0]?.trim() ?? "");
  push(brandSlugFromDomain(ctx.domain));

  const tt = ctx.discoveredIds?.tiktok?.trim();
  if (tt) push(tt.replace(/^@+/, ""));

  const sc = ctx.discoveredIds?.snapchat?.trim();
  if (sc) push(sc.replace(/^@+/, ""));

  const pin = ctx.discoveredIds?.pinterest?.trim();
  if (pin) {
    const h = extractPinterestHandleFromUrlOrString(pin);
    if (h) push(h);
  }

  return out;
}

async function runSearches(
  app: InstanceType<typeof Firecrawl>,
  queries: string[],
  limit: number
): Promise<SearchHit[]> {
  const merged: SearchHit[] = [];
  const seen = new Set<string>();
  for (const q of queries) {
    try {
      const res = await app.search(q, {
        limit,
        sources: [{ type: "web" }],
      });
      for (const h of webHitsToSearchHits((res.web ?? []) as Parameters<typeof webHitsToSearchHits>[0])) {
        const k = h.url.split("#")[0].toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          merged.push(h);
        }
      }
    } catch {
      /* skip query */
    }
  }
  return merged;
}

/** Per-platform web search with site: filters + multiple phrasings */
export async function fallbackSearchForSocials(
  app: InstanceType<typeof Firecrawl>,
  ctx: { safeName: string; domain: string; searchPhrase: string },
  missing: (keyof PlatformIdentifier)[]
): Promise<{ ids: Partial<PlatformIdentifier>; allHits: SearchHit[] }> {
  const brandSlug = brandSlugFromDomain(ctx.domain);
  const safeName = ctx.safeName.split("/")[0]?.trim() || brandSlug;
  const q = ctx.searchPhrase.trim() || safeName;
  const qShort = q.length > 64 ? q.slice(0, 64) : q;
  const domain = ctx.domain.replace(/^www\./, "");

  const results: Partial<PlatformIdentifier> = {};
  const allHits: SearchHit[] = [];

  const runKey = async (key: keyof PlatformIdentifier, queries: string[], limit = 5) => {
    const hits = await runSearches(app, queries, limit);
    allHits.push(...hits);
    const parsed = parseSocialLinksFromHits(hits);
    if (parsed[key]) results[key] = parsed[key];
  };

  const tasks: Promise<void>[] = [];

  for (const key of missing) {
    if (!FALLBACK_SEARCH_KEYS.includes(key)) continue;

    switch (key) {
      case "meta":
        tasks.push(
          runKey("meta", [
            `${brandSlug} site:facebook.com`,
            `"${safeName}" facebook page`,
            `"${qShort}" facebook official page`,
            `facebook.com ${brandSlug} official`,
            `"${domain}" facebook business page`,
            `${safeName} facebook business`,
            `site:facebook.com ${brandSlug}`,
          ])
        );
        break;
      case "tiktok":
        tasks.push(
          runKey("tiktok", [
            `${brandSlug} site:tiktok.com`,
            `"${safeName}" tiktok official`,
            `"${qShort}" tiktok`,
            `@${brandSlug} tiktok`,
          ])
        );
        break;
      case "linkedin":
        tasks.push(
          runKey("linkedin", [
            `${brandSlug} site:linkedin.com/company`,
            `"${safeName}" linkedin company`,
            `"${qShort}" linkedin`,
          ])
        );
        break;
      case "pinterest":
        tasks.push(
          runKey("pinterest", [
            `${brandSlug} site:pinterest.com`,
            `"${safeName}" pinterest`,
            `"${qShort}" pinterest`,
          ])
        );
        break;
      case "snapchat":
        tasks.push(
          runKey("snapchat", [
            `${brandSlug} site:snapchat.com/add`,
            `"${safeName}" snapchat`,
            `"${qShort}" snapchat`,
          ])
        );
        break;
      default:
        break;
    }
  }

  await Promise.all(tasks);

  return { ids: results, allHits };
}

async function imageSearchFirstHit(
  app: InstanceType<typeof Firecrawl>,
  query: string,
  limit = 4
): Promise<string | undefined> {
  try {
    const res = await app.search(query, {
      limit,
      sources: [{ type: "images" }],
    });
    for (const img of res.images ?? []) {
      if (img && "imageUrl" in img && typeof img.imageUrl === "string" && img.imageUrl.startsWith("http")) {
        return img.imageUrl;
      }
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export async function resolveBrandLogo(
  app: InstanceType<typeof Firecrawl>,
  args: { displayName: string; domain: string; brandLabel: string; scrapeLogo?: string }
): Promise<string> {
  const dom = args.domain.replace(/^www\./, "").split("/")[0] || args.domain;
  const fav = googleFaviconUrlForDomain(dom);
  const slug = args.displayName.split("/")[0]?.trim() || args.brandLabel;

  const queries = [
    `${args.brandLabel} ${dom} logo official`,
    `${slug} brand logo png`,
    `${dom} company logo`,
  ];

  const fromSearch = await Promise.all(queries.map((q) => imageSearchFirstHit(app, q)));

  const scrape = args.scrapeLogo?.startsWith("http") ? args.scrapeLogo : undefined;
  const firstHit = fromSearch.find((u) => u?.startsWith("http"));

  const candidates: string[] = [
    ...(firstHit ? [firstHit] : []),
    ...(scrape ? [scrape] : []),
    ...fromSearch.filter((u): u is string => Boolean(u) && u !== firstHit),
    `https://logo.clearbit.com/${encodeURIComponent(dom)}`,
    fav,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(dom)}.ico`,
  ];

  return candidates.find((u) => u.startsWith("http")) ?? fav;
}

export function buildFieldConfidence(
  fromScrape: Partial<PlatformIdentifier>,
  merged: Partial<PlatformIdentifier>,
  scrapeSucceeded: boolean
): Partial<Record<ChannelId, "high" | "medium" | "low">> {
  const out: Partial<Record<ChannelId, "high" | "medium" | "low">> = {};
  const keys: ChannelId[] = [
    "meta",
    "google",
    "tiktok",
    "linkedin",
    "pinterest",
    "snapchat",
  ];

  for (const k of keys) {
    const v = merged[k];
    if (v == null || (typeof v === "string" && !v.trim())) continue;

    if (k === "google") {
      out[k] = "high";
      continue;
    }

    if (k === "meta") {
      const digits = String(merged.meta ?? "").replace(/\D/g, "");
      const isNumeric = digits.length >= 10 && digits.length <= 22 && /^\d+$/.test(digits);
      if (isNumeric) out[k] = "high";
      else if (merged.metaPageUrl || fromScrape.meta || fromScrape.metaPageUrl) out[k] = "medium";
      else out[k] = "low";
      continue;
    }

    if (k === "linkedin") {
      const s = String(v);
      if (isLinkedInAdLibraryCompanyIdsUrl(s)) {
        out[k] = "high";
        continue;
      }
    }

    const had = fromScrape[k];
    const hadStr = had != null && String(had).trim().length > 0;
    if (hadStr && String(had) === String(v)) out[k] = "high";
    else if (hadStr) out[k] = "medium";
    else out[k] = scrapeSucceeded ? "medium" : "low";
  }

  return out;
}

export function buildFieldPreviewUrls(
  discovered: Partial<PlatformIdentifier>,
  metaHits: SearchHit[],
  scrapeLinks: string[]
): Partial<Record<ChannelId, string>> {
  const linkHits: SearchHit[] = [...metaHits, ...scrapeLinks.map((url) => ({ url }))];
  const out: Partial<Record<ChannelId, string>> = {};

  if (discovered.google) {
    out.google = `https://${discovered.google.replace(/^www\./, "")}`;
  }

  const metaPage = discovered.metaPageUrl?.trim();
  if (metaPage && isMetaAdLibraryUrl(metaPage)) {
    out.meta = metaPage.startsWith("http") ? metaPage : `https://${metaPage}`;
  } else {
    const d = String(discovered.meta ?? "").replace(/\D/g, "");
    if (d.length >= 10 && d.length <= 22) {
      out.meta = buildMetaAdLibraryUrl(d);
    } else {
      out.meta = "https://www.facebook.com/ads/library/";
    }
  }

  if (discovered.linkedin?.trim()) {
    const l = discovered.linkedin.trim();
    out.linkedin = l.startsWith("http") ? l : `https://${l}`;
  } else {
    const u = pickPreviewUrlFromHits(linkHits, "linkedin");
    if (u) out.linkedin = u;
  }

  return out;
}
