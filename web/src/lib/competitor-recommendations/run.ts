import { hostOf, registrableDomain } from "@/lib/ad-account-discovery/score";
import {
  extractCandidates,
  mapsCandidates,
  mapsSearch,
  mergeCandidates,
  webSearch,
} from "@/lib/competitor-recommendations/candidates";
import type { CostTracker } from "@/lib/competitor-recommendations/llm-json";
import { buildBrandProfile } from "@/lib/competitor-recommendations/profile";
import { MIN_RELEVANCE, rankCandidates } from "@/lib/competitor-recommendations/rank";
import { META_ADS_PER_DOMAIN, metaAdCounts, trancoRanks } from "@/lib/competitor-recommendations/size";
import { readSiteText } from "@/lib/competitor-recommendations/site-text";
import type { Candidate, RecommendationRun, SizeSignals } from "@/lib/competitor-recommendations/types";
import { verifyCandidates } from "@/lib/competitor-recommendations/verify";

/**
 * Recommended competitors for a business, from its website:
 *
 * 1. Profile the business from its homepage (what, for whom, price, local or online, where, language).
 * 2. Candidates: web searches in its language and country; for local businesses, Google Maps around it;
 *    plus brands the model knows, which must still pass step 3.
 * 3. Each candidate's own homepage is read and judged: direct competitor or not, with evidence.
 * 4. Size: Tranco rank (online) or Maps reviews (local), and active Meta ads linking to the site.
 * 5. Rank: closest competitors a step bigger than the user, who advertise, first.
 *
 * Runs on demand only. Roughly $0.10–0.35 a run (model calls, Firecrawl searches, Apify Meta/Maps).
 */

const MAX_TO_VERIFY = 18;
const MAX_SIZED = 10;
const MAX_AD_COUNTED = 6;
const MAPS_PLACES = 20;
const OWN_MAPS_PLACES = 3;
const META_COST_PER_AD = 0.00075;
const MAPS_COST_PER_PLACE = 0.004;

export async function recommendCompetitors(input: {
  url: string;
  brandContext?: string | null;
  markets?: string[];
}): Promise<RecommendationRun> {
  const started = Date.now();
  const cost: CostTracker = { usd: 0 };
  const stageMs: Record<string, number> = {};
  let mark = started;
  const stage = (name: string) => {
    stageMs[name] = Date.now() - mark;
    mark = Date.now();
  };
  const host = hostOf(input.url);
  if (!host || !host.includes(".")) throw new Error("A website domain is required");
  const domain = registrableDomain(host);

  const site = await readSiteText(domain);
  if (!site) throw new Error(`Couldn't read ${domain}`);
  const profile = await buildBrandProfile(domain, site, { brandContext: input.brandContext, markets: input.markets }, cost);
  stage("profile");
  // The user's own ad count doesn't depend on the candidates: start it now, off the critical path.
  const ownAds = metaAdCounts([domain]);

  const mapsFailed = (e: unknown) => {
    console.warn("[competitor-recommendations] maps", e instanceof Error ? e.message : e);
    return [];
  };
  const [results, places, ownPlaces] = await Promise.all([
    webSearch(profile).catch(() => []),
    mapsSearch(profile, MAPS_PLACES).catch(mapsFailed),
    // The business itself, for its review count: it isn't always among the category results.
    mapsSearch(profile, OWN_MAPS_PLACES, profile.brandName).catch(mapsFailed),
  ]);
  cost.usd += (places.length + ownPlaces.length) * MAPS_COST_PER_PLACE;
  stage("search");

  const extracted = await extractCandidates(profile, results, cost).catch(() => [] as Candidate[]);
  const merged = mergeCandidates(domain, [mapsCandidates(places), extracted]);
  // Found in search results or on the map before the model's own suggestions.
  const ordered = [
    ...merged.filter((c) => !c.sources.every((s) => s === "knowledge")),
    ...merged.filter((c) => c.sources.every((s) => s === "knowledge")),
  ].slice(0, MAX_TO_VERIFY);

  stage("extract");

  const verified = await verifyCandidates(profile, ordered, cost);
  stage("verify");
  const direct = verified
    .filter((c) => c.isDirect && c.relevance >= MIN_RELEVANCE)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, MAX_SIZED);

  const sizedDomains = [domain, ...direct.map((c) => c.domain)];
  // Apify runs three Meta searches at a time, so only the closest few are counted; the rest stay unknown.
  const adCounted = direct.slice(0, MAX_AD_COUNTED).map((c) => c.domain);
  const [ranks, theirAds, ownAdCount] = await Promise.all([
    profile.businessType === "local" ? Promise.resolve(new Map<string, number | null>()) : trancoRanks(sizedDomains),
    metaAdCounts(adCounted),
    ownAds,
  ]);
  const ads = new Map([...theirAds, ...ownAdCount]);
  cost.usd += (adCounted.length + 1) * META_ADS_PER_DOMAIN * META_COST_PER_AD;
  stage("size");

  const ownPlace = [...ownPlaces, ...places].find((p) => {
    const h = hostOf(p.website);
    return h != null && registrableDomain(h) === domain;
  });
  const ownSize: SizeSignals = {
    trancoRank: ranks.get(domain) ?? null,
    metaAds: ads.get(domain) ?? null,
    reviewsCount: ownPlace?.reviewsCount ?? null,
  };
  const sizes = new Map<string, SizeSignals>(
    direct.map((c) => [
      c.domain,
      { trancoRank: ranks.get(c.domain) ?? null, metaAds: ads.get(c.domain) ?? null, reviewsCount: c.reviewsCount ?? null },
    ]),
  );

  const recommendations = rankCandidates(profile, ownSize, direct, sizes);
  const kept = new Set(recommendations.map((r) => r.domain));
  const rejected = verified
    .filter((c) => !kept.has(c.domain))
    .map((c) => ({
      domain: c.domain,
      name: c.name,
      reason:
        c.rejectReason ??
        (!c.isDirect
          ? "Not a direct competitor"
          : c.relevance < MIN_RELEVANCE
            ? `Only loosely related (relevance ${c.relevance})`
            : "Direct, but ranked below the ones shown"),
    }));

  return {
    profile,
    ownSize,
    recommendations,
    rejected,
    costUsd: Math.round(cost.usd * 1000) / 1000,
    durationMs: Date.now() - started,
    stageMs,
  };
}
