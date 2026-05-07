import { NextResponse } from "next/server";
import Firecrawl from "@mendable/firecrawl-js";
import type { Document, ScrapeOptions } from "@mendable/firecrawl-js";
import type { ChannelId } from "@/components/channel-picker-modal";
import { interpretCompetitorQuery, type TermHint } from "@/lib/competitor-query";
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
  refineRedditWithBrand,
  refineSnapchatWithBrand,
  parseSocialLinksFromHits,
  normalizeDiscoveredIds,
  googleFaviconUrlForDomain,
  pickBestFacebookPageUrl,
  pickPreviewUrlFromHits,
  type PlatformIdentifier,
  type SearchHit,
} from "@/lib/discovery";
import { extractPinterestHandleFromUrlOrString } from "@/lib/ad-library/pinterest-handle";

const TIMEOUT_MS = 55_000;

/** Vercel / long-running discovery (optional; ignored locally) */
export const maxDuration = 60;

export type DiscoverResponse = {
  success: boolean;
  brand?: { name: string; domain: string; logoUrl?: string };
  discoveredIds?: Partial<PlatformIdentifier>;
  interpretation?: {
    summary: string;
    primaryBrandName: string;
    primaryDomain: string | null;
    termBreakdown: { brands: number; urls: number; keywords: number };
  };
  /** high = from their site; medium/low = from search — ask user to verify */
  fieldConfidence?: Partial<Record<ChannelId, "high" | "medium" | "low">>;
  /** Open in new tab to double-check a discovered profile */
  fieldPreviewUrls?: Partial<Record<ChannelId, string>>;
  error?: string;
  warning?: string;
};

function getFirecrawl() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }
  return new Firecrawl({ apiKey, timeoutMs: TIMEOUT_MS });
}

async function resolveLandingUrl(
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

function documentToScrapeResult(
  doc: Document,
  resolvedUrl: string
): {
  discoveredIds: Partial<PlatformIdentifier>;
  logoUrl?: string;
  domain: string;
  links: string[];
} {
  const domain = extractDomain(resolvedUrl);
  const links: string[] = [
    ...(doc.links ?? []),
    ...extractLinksFromContent(doc.markdown ?? ""),
  ];
  const discoveredIds = parseSocialLinks(links);
  discoveredIds.google = domain;
  const logoUrl =
    doc.metadata?.ogImage ??
    doc.metadata?.favicon ??
    (doc.metadata as { logo?: string })?.logo;
  return { discoveredIds, logoUrl: logoUrl || undefined, domain, links };
}

async function scrapeWithFallbacks(
  app: InstanceType<typeof Firecrawl>,
  landingUrl: string
): Promise<ReturnType<typeof documentToScrapeResult> | null> {
  const urls = landingUrlVariants(landingUrl);
  const baseFormats: ScrapeOptions["formats"] = [{ type: "markdown" }, { type: "links" }];

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

  for (const url of urls) {
    for (const opts of attempts) {
      try {
        const doc = await app.scrape(url, opts);
        const md = doc.markdown?.trim().length ?? 0;
        const linkCount = doc.links?.length ?? 0;
        const hasMeta =
          Boolean(doc.metadata?.ogTitle) ||
          Boolean(doc.metadata?.ogImage) ||
          Boolean(doc.metadata?.description);
        if (md > 80 || linkCount > 0 || hasMeta) {
          return documentToScrapeResult(doc, url);
        }
      } catch {
        /* next */
      }
    }
  }
  return null;
}

/** Scrape public Facebook HTML for embedded numeric page id (works when search finds /pagename) */
async function tryResolveMetaPageIdFromFacebookUrls(
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
async function fallbackSearchForSocials(
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
      case "reddit":
        tasks.push(
          runKey("reddit", [
            `${brandSlug} site:reddit.com`,
            `"${safeName}" site:reddit.com`,
            `"${qShort}" reddit`,
            `reddit.com/r/${brandSlug}`,
            `site:reddit.com/user/${brandSlug}`,
            `"${safeName}" reddit official user`,
            `${brandSlug} reddit brand account`,
            `"${domain}" reddit community`,
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

/** Prefer image search + scraped og; always end with favicon URLs so the UI never shows a blank glyph */
async function resolveBrandLogo(
  app: InstanceType<typeof Firecrawl>,
  args: { displayName: string; domain: string; brandLabel: string; scrapeLogo?: string }
): Promise<string> {
  const dom = args.domain.replace(/^www\./, "").split("/")[0] || args.domain;
  const fav = googleFaviconUrlForDomain(dom);
  const slug = args.displayName.split(".")[0]?.trim() || args.brandLabel;

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

function parseTermHints(body: unknown): TermHint[] | null {
  const b = body as Record<string, unknown>;
  const raw = b?.terms;
  if (Array.isArray(raw)) {
    const out: TermHint[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const value = typeof o.value === "string" ? o.value.trim() : "";
      const kind = o.kind === "url" || o.kind === "brand" || o.kind === "keyword" ? o.kind : null;
      if (!value || !kind) continue;
      out.push({ value, kind });
    }
    return out.length ? out : null;
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parseTermHints({ terms: parsed });
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

type CompetitorInterpretation = ReturnType<typeof interpretCompetitorQuery>;

/** When Firecrawl is unavailable, still return a usable domain so the manual-ID flow works */
function guessDomainForLimitedDiscovery(interpretation: CompetitorInterpretation, query: string): string {
  if (interpretation.primaryDomain) {
    return interpretation.primaryDomain.replace(/^www\./, "");
  }
  const seg = firstUrlLikeSegment(query);
  if (seg) {
    try {
      return extractDomain(toFullUrl(seg));
    } catch {
      /* continue */
    }
  }
  const brand = interpretation.primaryBrandName?.trim();
  if (brand && brand !== "This competitor") {
    const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (slug.length >= 2) return `${slug}.com`;
  }
  const first = query.trim().split(/\s+/)[0] ?? "";
  if (first && looksLikeUrl(first)) {
    return extractDomain(toFullUrl(first));
  }
  const token = first.replace(/[^a-z0-9.-]/gi, "").toLowerCase();
  if (token.includes(".")) {
    try {
      return extractDomain(toFullUrl(token));
    } catch {
      /* continue */
    }
  }
  if (token.length >= 2) return `${token}.com`;
  return "example.com";
}

function buildFieldConfidence(
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
    "reddit",
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

    const had = fromScrape[k];
    const hadStr = had != null && String(had).trim().length > 0;
    if (hadStr && String(had) === String(v)) out[k] = "high";
    else if (hadStr) out[k] = "medium";
    else out[k] = scrapeSucceeded ? "medium" : "low";
  }

  return out;
}

function buildFieldPreviewUrls(
  discovered: Partial<PlatformIdentifier>,
  metaHits: SearchHit[],
  scrapeLinks: string[]
): Partial<Record<ChannelId, string>> {
  const linkHits: SearchHit[] = [...metaHits, ...scrapeLinks.map((url) => ({ url }))];
  const out: Partial<Record<ChannelId, string>> = {};

  if (discovered.google) {
    out.google = `https://${discovered.google.replace(/^www\./, "")}`;
  }

  if (discovered.metaPageUrl) {
    out.meta = discovered.metaPageUrl;
  } else {
    const fb = pickPreviewUrlFromHits(linkHits, "meta");
    if (fb) out.meta = fb;
    else {
      const d = String(discovered.meta ?? "").replace(/\D/g, "");
      if (d.length >= 10 && d.length <= 22) {
        out.meta = `https://www.facebook.com/profile.php?id=${d}`;
      }
    }
  }

  if (discovered.tiktok) {
    const h = discovered.tiktok.replace(/^@/, "");
    out.tiktok = `https://www.tiktok.com/@${h}`;
  } else {
    const u = pickPreviewUrlFromHits(linkHits, "tiktok");
    if (u) out.tiktok = u;
  }

  if (discovered.linkedin) {
    const l = discovered.linkedin.trim();
    out.linkedin = l.startsWith("http") ? l : `https://${l}`;
  } else {
    const u = pickPreviewUrlFromHits(linkHits, "linkedin");
    if (u) out.linkedin = u;
  }

  if (discovered.pinterest) {
    const p = discovered.pinterest.trim();
    out.pinterest = p.startsWith("http") ? p : `https://${p}`;
  } else {
    const u = pickPreviewUrlFromHits(linkHits, "pinterest");
    if (u) out.pinterest = u;
  }

  if (discovered.snapchat) {
    const h = discovered.snapchat.replace(/^@/, "");
    out.snapchat = `https://www.snapchat.com/add/${h}`;
  } else {
    const u = pickPreviewUrlFromHits(linkHits, "snapchat");
    if (u) out.snapchat = u;
  }

  if (discovered.reddit) {
    const r = discovered.reddit.trim();
    out.reddit = r.startsWith("http") ? r : `https://${r}`;
  } else {
    const u = pickPreviewUrlFromHits(linkHits, "reddit");
    if (u) out.reddit = u;
  }

  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const selectedChannels = Array.isArray(body?.channels)
      ? (body.channels as string[]).filter(Boolean)
      : null;
    if (!query) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid query" },
        { status: 400 }
      );
    }

    const termHints = parseTermHints(body);
    const interpretation = interpretCompetitorQuery(query, termHints);
    const searchForLanding = interpretation.searchPhrase.trim() || query;

    let app: InstanceType<typeof Firecrawl>;
    try {
      app = getFirecrawl();
    } catch {
      const domain = guessDomainForLimitedDiscovery(interpretation, query);
      const brandName = interpretation.primaryBrandName;
      const logoUrl = googleFaviconUrlForDomain(domain);
      return NextResponse.json({
        success: true,
        brand: {
          name: brandName,
          domain,
          logoUrl,
        },
        discoveredIds: { google: domain },
        interpretation: {
          summary: interpretation.interpretationSummary,
          primaryBrandName: interpretation.primaryBrandName,
          primaryDomain: interpretation.primaryDomain,
          termBreakdown: {
            brands: interpretation.brandTokens.length,
            urls: interpretation.urlTokens.length,
            keywords: interpretation.keywordTokens.length,
          },
        },
        fieldConfidence: {},
        fieldPreviewUrls: {},
        warning:
          "Full automated discovery requires a working FIRECRAWL_API_KEY. Using a best-guess domain from your query — confirm or edit platform links below.",
      } satisfies DiscoverResponse);
    }

    const landingUrl = await resolveLandingUrl(
      app,
      searchForLanding,
      interpretation.primaryLandingUrl
    );

    const scraped = await scrapeWithFallbacks(app, landingUrl);
    let fromScrape: Partial<PlatformIdentifier>;
    let scrapeLogo: string | undefined;
    let scrapedDomain: string;
    let warning: string | undefined;

    if (scraped) {
      fromScrape = scraped.discoveredIds;
      scrapeLogo = scraped.logoUrl;
      scrapedDomain = scraped.domain;
    } else {
      scrapedDomain = extractDomain(landingUrl);
      fromScrape = { google: scrapedDomain };
      scrapeLogo = undefined;
      warning =
        "We couldn't load that site automatically (it may block bots or be down). " +
        "Showing what we found from web search — please confirm the links below.";
    }

    const allKeys: (keyof PlatformIdentifier)[] = [
      "meta",
      "google",
      "tiktok",
      "linkedin",
      "pinterest",
      "snapchat",
      "reddit",
    ];
    let missing = allKeys.filter((k) => !fromScrape[k]);
    if (selectedChannels?.length) {
      missing = missing.filter((k) => selectedChannels.includes(k));
    }

    const brandName = interpretation.primaryBrandName;

    const searchCtx = {
      safeName: brandName,
      domain: scrapedDomain,
      searchPhrase: interpretation.searchPhrase,
    };

    const [fallbackBundle, logoUrl] = await Promise.all([
      missing.length > 0
        ? fallbackSearchForSocials(app, searchCtx, missing)
        : Promise.resolve({ ids: {} as Partial<PlatformIdentifier>, allHits: [] as SearchHit[] }),
      resolveBrandLogo(app, {
        displayName: brandName,
        domain: scrapedDomain,
        brandLabel: brandName,
        scrapeLogo,
      }).catch(() => googleFaviconUrlForDomain(scrapedDomain)),
    ]);

    let discoveredIds: Partial<PlatformIdentifier> = {
      ...fromScrape,
      ...fallbackBundle.ids,
    };

    const scrapeLinkHits: SearchHit[] = (scraped?.links ?? []).map((u) => ({ url: u }));
    const metaHits: SearchHit[] = [...fallbackBundle.allHits, ...scrapeLinkHits];

    discoveredIds = refineRedditWithBrand(discoveredIds, metaHits, scrapedDomain);
    discoveredIds = refineSnapchatWithBrand(discoveredIds, metaHits, scrapedDomain);

    if (selectedChannels === null || selectedChannels.includes("meta")) {
      const needMeta =
        !discoveredIds.meta ||
        (discoveredIds.meta && !/^\d{10,22}$/.test(String(discoveredIds.meta).replace(/\D/g, "")));
      if (needMeta && metaHits.length > 0) {
        const resolved = await tryResolveMetaPageIdFromFacebookUrls(
          app,
          metaHits,
          discoveredIds.meta
        );
        if (resolved) {
          discoveredIds = { ...discoveredIds, meta: resolved };
        }
      }
      const fbPageUrl = pickBestFacebookPageUrl(metaHits, scrapedDomain);
      if (fbPageUrl) {
        discoveredIds = { ...discoveredIds, metaPageUrl: fbPageUrl };
      }
    }

    if (
      (selectedChannels === null || selectedChannels.includes("pinterest")) &&
      discoveredIds.pinterest?.trim()
    ) {
      const handle = extractPinterestHandleFromUrlOrString(discoveredIds.pinterest.trim());
      if (handle) {
        discoveredIds = { ...discoveredIds, pinterestAdvertiserName: handle };
      }
    }

    discoveredIds = normalizeDiscoveredIds(discoveredIds);

    const scrapeSucceeded = Boolean(scraped);
    const fieldConfidence = buildFieldConfidence(fromScrape, discoveredIds, scrapeSucceeded);
    const fieldPreviewUrls = buildFieldPreviewUrls(
      discoveredIds,
      metaHits,
      scraped?.links ?? []
    );

    return NextResponse.json({
      success: true,
      brand: {
        name: brandName,
        domain: scrapedDomain,
        logoUrl,
      },
      discoveredIds,
      interpretation: {
        summary: interpretation.interpretationSummary,
        primaryBrandName: interpretation.primaryBrandName,
        primaryDomain: interpretation.primaryDomain,
        termBreakdown: {
          brands: interpretation.brandTokens.length,
          urls: interpretation.urlTokens.length,
          keywords: interpretation.keywordTokens.length,
        },
      },
      fieldConfidence,
      fieldPreviewUrls,
      ...(warning ? { warning } : {}),
    } satisfies DiscoverResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Discovery failed";
    return NextResponse.json(
      { success: false, error: message } satisfies DiscoverResponse,
      { status: 500 }
    );
  }
}
