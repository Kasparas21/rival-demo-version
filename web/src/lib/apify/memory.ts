/** Default RAM per actor run on upgraded Apify plans (32GB account). Override globally or per actor. */
const MAX_MEMORY_MBYTES = 32768;

/**
 * Resolve Apify actor `memoryMbytes`. Checks `APIFY_ACTOR_MEMORY_MBYTES` first, then an actor-specific env var.
 */
export function readApifyActorMemoryMbytes(
  perActorEnvKey: string | undefined,
  defaultMb: number
): number {
  const candidates = [process.env.APIFY_ACTOR_MEMORY_MBYTES?.trim()];
  if (perActorEnvKey) candidates.push(process.env[perActorEnvKey]?.trim());
  for (const raw of candidates) {
    if (!raw) continue;
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 256) return Math.min(n, MAX_MEMORY_MBYTES);
  }
  return defaultMb;
}

/** Heavy scrapers (Meta, Google, TikTok) — 4GB default on 32GB Apify accounts. */
export const APIFY_HEAVY_ACTOR_MEMORY_MBYTES = 4096;

/** Lighter scrapers (Pinterest, Snapchat, LinkedIn). */
export const APIFY_LIGHT_ACTOR_MEMORY_MBYTES = 1024;

/** `curious_coder/facebook-ads-library-scraper` — 1 input URL per 512MB RAM. */
export const FACEBOOK_ADS_MB_PER_INPUT_URL = 512;

/** Cap Meta actor memory so it never exceeds `urlCount × 512MB`. */
export function readFacebookAdsMemoryMbytes(urlCount: number): number {
  const urls = Math.max(1, urlCount);
  const maxForUrls = urls * FACEBOOK_ADS_MB_PER_INPUT_URL;
  const requested = readApifyActorMemoryMbytes("META_ADS_MEMORY_MBYTES", maxForUrls);
  return Math.min(requested, maxForUrls);
}
