import { runActor } from "@/lib/ad-account-discovery/discover";
import { hostOf, registrableDomain } from "@/lib/ad-account-discovery/score";
import { createDiscoverFirecrawlClient } from "@/lib/competitor-discover-firecrawl";
import { llmJson, type CostTracker } from "@/lib/competitor-recommendations/llm-json";
import type { BrandProfile, Candidate, CandidateSource } from "@/lib/competitor-recommendations/types";

/** Marketplaces, social networks, media and review sites: never a competitor, though their pages name some. */
const NOT_A_COMPETITOR =
  /(^|\.)(amazon|ebay|etsy|walmart|target|aliexpress|alibaba|temu|shein|zalando|asos|wikipedia|youtube|facebook|instagram|tiktok|pinterest|linkedin|twitter|x|reddit|quora|medium|yelp|tripadvisor|trustpilot|google|apple|microsoft|g2|capterra|getapp|producthunt|forbes|nytimes|cnn|bbc|businessinsider|buzzfeed|vogue|wired|theverge|techcrunch|nerdwallet|healthline|webmd|glassdoor|indeed|crunchbase|similarweb|semrush|ahrefs|shopify|wix|squarespace|wordpress|blogspot|substack|github|apps\.apple|play\.google|booking|airbnb|groupon|pigu|varle|senukai|skelbiu|cv|delfi|15min|lrytas|vz)\.[a-z.]+$/;

export function isNeverCompetitor(domain: string): boolean {
  return NOT_A_COMPETITOR.test(domain);
}

const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

function searchLocation(profile: BrandProfile): string | undefined {
  const country = profile.country ? COUNTRY_NAMES.of(profile.country) : undefined;
  if (profile.businessType === "local" && profile.city) return country ? `${profile.city},${country}` : profile.city;
  return country;
}

export type SearchResult = { url: string; title: string; description: string };

/** Web results for the profile's competitor queries, in its country (Firecrawl, ~2 credits per query). */
export async function webSearch(profile: BrandProfile): Promise<SearchResult[]> {
  const app = createDiscoverFirecrawlClient();
  const location = searchLocation(profile);
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  const runs = await Promise.allSettled(
    profile.searchQueries.map((query) =>
      app.search(query, { limit: 10, sources: [{ type: "web" }], ...(location ? { location } : {}) }),
    ),
  );
  for (const run of runs) {
    if (run.status !== "fulfilled") continue;
    for (const hit of (run.value.web ?? []) as { url?: string; title?: string; description?: string }[]) {
      const url = hit.url?.split("#")[0];
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push({ url, title: hit.title ?? "", description: (hit.description ?? "").slice(0, 300) });
    }
  }
  return out;
}

export type MapsPlace = {
  name: string;
  website: string | null;
  category: string | null;
  reviewsCount: number | null;
  rating: number | null;
  address: string | null;
};

/** Businesses of the same kind around a local business (Google Maps via Apify, ~$0.004 a place). */
export async function mapsSearch(profile: BrandProfile, max = 20, query = profile.localSearchTerm): Promise<MapsPlace[]> {
  if (profile.businessType !== "local" || !query || !profile.city) return [];
  const location = [profile.city, profile.country ? COUNTRY_NAMES.of(profile.country) : null].filter(Boolean).join(", ");
  const items = await runActor(
    process.env.APIFY_GOOGLE_MAPS_ACTOR?.trim() || "compass/crawler-google-places",
    {
      searchStringsArray: [query],
      locationQuery: location,
      maxCrawledPlacesPerSearch: max,
      language: profile.language || "en",
      skipClosedPlaces: true,
      scrapePlaceDetailPage: false,
    },
    { maxItems: max, memoryMbytes: 1024 },
  );
  return items.map((raw) => {
    const r = raw as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    return {
      name: typeof r.title === "string" ? r.title : "",
      website: typeof r.website === "string" ? r.website : null,
      category: typeof r.categoryName === "string" ? r.categoryName : null,
      reviewsCount: num(r.reviewsCount),
      rating: num(r.totalScore),
      address: typeof r.address === "string" ? r.address : null,
    };
  });
}

const EXTRACT_SYSTEM = `You pick out a business's direct competitors from search results. Answer only with JSON. Never invent a website: every domain must appear in the results, or (for brands you list from your own knowledge) be the brand's well-known official site.`;

/**
 * Names and official domains of competing brands found in the search results (brand sites, and brands
 * named in comparison or "best of" pages), plus a few the model knows, marked as such.
 */
export async function extractCandidates(
  profile: BrandProfile,
  results: SearchResult[],
  cost: CostTracker,
): Promise<Candidate[]> {
  const local = profile.businessType === "local";
  const list = results
    .slice(0, 40)
    .map((r, i) => `[${i}] ${r.title} | ${r.url}\n${r.description}`)
    .join("\n");
  const raw = await llmJson({
    system: EXTRACT_SYSTEM,
    maxTokens: 1800,
    cost,
    user: `The business: ${profile.brandName} (${profile.domain}). ${profile.offering}
Category: ${profile.category}. Customers: ${profile.customer}. Price: ${profile.priceTier}. ${
      local ? `Local business in ${profile.city ?? "?"}, ${profile.country ?? "?"}.` : `Sells mainly in ${profile.country ?? "unknown country"}.`
    }

Search results:
${list}

List up to 15 businesses that compete directly with it for the same customers${local ? " in the same area" : ""}. Use a business's own website as its domain (not a marketplace, review site, directory or article). If a comparison or "best of" page names a brand but doesn't link its site, include the brand with its official domain only if you're sure of it.${
      local
        ? ""
        : ` Then add up to 5 more direct competitors you know of that the results missed, only ones that sell in ${profile.country ?? "the same market"}.`
    }

Return {"candidates": [{"name": string, "domain": "example.com", "source": "web" | "knowledge", "hint": short reason it's a competitor}]}`,
  });
  const arr = (raw as { candidates?: unknown })?.candidates;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((c) => {
      const r = c as Record<string, unknown>;
      const host = hostOf(typeof r.domain === "string" ? r.domain : null);
      return host
        ? {
            domain: registrableDomain(host),
            name: typeof r.name === "string" && r.name.trim() ? r.name.trim() : host,
            sources: [r.source === "knowledge" ? "knowledge" : "web"] as CandidateSource[],
            hint: typeof r.hint === "string" ? r.hint.slice(0, 200) : null,
          }
        : null;
    })
    .filter((c): c is Candidate => c != null);
}

/** Maps places with a website, as candidates (their reviews count is the size signal). */
export function mapsCandidates(places: MapsPlace[]): Candidate[] {
  const out: Candidate[] = [];
  for (const p of places) {
    const host = hostOf(p.website);
    if (!host) continue;
    out.push({
      domain: registrableDomain(host),
      name: p.name || host,
      sources: ["maps"],
      hint: p.category,
      reviewsCount: p.reviewsCount,
      rating: p.rating,
      address: p.address,
    });
  }
  return out;
}

/** One entry per domain, sources merged; drops the user's own domain and non-competitors. Pure. */
export function mergeCandidates(ownDomain: string, lists: Candidate[][]): Candidate[] {
  const own = registrableDomain(ownDomain);
  const byDomain = new Map<string, Candidate>();
  for (const c of lists.flat()) {
    if (!c.domain || c.domain === own || isNeverCompetitor(c.domain)) continue;
    const prev = byDomain.get(c.domain);
    if (!prev) {
      byDomain.set(c.domain, { ...c, sources: [...c.sources] });
      continue;
    }
    for (const s of c.sources) if (!prev.sources.includes(s)) prev.sources.push(s);
    prev.reviewsCount ??= c.reviewsCount;
    prev.rating ??= c.rating;
    prev.address ??= c.address;
    prev.hint ??= c.hint;
    if (c.sources.includes("maps")) prev.name = c.name;
  }
  return [...byDomain.values()];
}
