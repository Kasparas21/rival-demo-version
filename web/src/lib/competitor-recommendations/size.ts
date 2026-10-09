import { metaAds, metaSearchUrl } from "@/lib/ad-account-discovery/discover";
import { domainLabel } from "@/lib/ad-account-discovery/score";

const TRANCO_GAP_MS = 1_100;
export const META_ADS_PER_DOMAIN = 10;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Latest Tranco rank (a free top-sites list; lower is bigger), null when the site isn't ranked. */
async function trancoRank(domain: string): Promise<number | null> {
  try {
    const res = await fetch(`https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { ranks?: { rank?: number }[] };
    const rank = j.ranks?.[0]?.rank;
    return typeof rank === "number" && rank > 0 ? rank : null;
  } catch {
    return null;
  }
}

/** Tranco ranks, one request a second (the API's free limit). */
export async function trancoRanks(domains: string[]): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>();
  for (const [i, d] of domains.entries()) {
    if (i > 0) await sleep(TRANCO_GAP_MS);
    out.set(d, await trancoRank(d));
  }
  return out;
}

const alnum = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Active Meta ads from each brand, from an Ad Library search for its domain: ads linking to the domain or
 * its country sites (allbirds.com.au counts for allbirds.com), or run by a page named after it (many link
 * to fb.com). One run per domain, since a shared run fills up with whichever brand comes first.
 * $0.00075 an ad, so counts are capped at 10.
 */
export async function metaAdCounts(domains: string[]): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>(domains.map((d) => [d, null]));
  await Promise.all(
    domains.map(async (d) => {
      try {
        const label = domainLabel(d);
        const name = alnum(label);
        const samples = await metaAds([metaSearchUrl(d)], META_ADS_PER_DOMAIN, false);
        const n = samples.filter(
          (s) => (s.linkHost && domainLabel(s.linkHost) === label) || (name.length >= 4 && alnum(s.pageName).startsWith(name)),
        ).length;
        out.set(d, Math.min(n, META_ADS_PER_DOMAIN));
      } catch (e) {
        console.warn("[competitor-recommendations] meta ad count", d, e instanceof Error ? e.message : e);
      }
    }),
  );
  return out;
}
