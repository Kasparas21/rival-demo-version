import { NextResponse } from "next/server";
import type { ChannelId } from "@/components/channel-picker-modal";
import { interpretCompetitorQuery, type TermHint } from "@/lib/competitor-query";
import {
  looksLikeUrl,
  toFullUrl,
  extractDomain,
  firstUrlLikeSegment,
  refineSnapchatWithBrand,
  normalizeDiscoveredIds,
  googleFaviconUrlForDomain,
  pickBestFacebookPageUrl,
  type PlatformIdentifier,
  type SearchHit,
} from "@/lib/discovery";
import { extractPinterestHandleFromUrlOrString } from "@/lib/ad-library/pinterest-handle";
import {
  createDiscoverFirecrawlClient,
  resolveLandingUrl,
  scrapeWithFallbacks,
  tryResolveMetaPageIdFromFacebookUrls,
  fallbackSearchForSocials,
  resolveBrandLogo,
  buildFieldConfidence,
  buildFieldPreviewUrls,
} from "@/lib/competitor-discover-firecrawl";

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

    let app: ReturnType<typeof createDiscoverFirecrawlClient>;
    try {
      app = createDiscoverFirecrawlClient();
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

    const scrapeLinkHits = (scraped?.links ?? []).map((u) => ({ url: u }));
    const metaHits = [...fallbackBundle.allHits, ...scrapeLinkHits];

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
