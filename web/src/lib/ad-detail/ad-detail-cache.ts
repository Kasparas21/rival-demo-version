import type { AdDetailDrawerPayload } from "@/lib/ad-detail/ad-detail-types";

export type AdDetailOpenSeed = {
  adId: string;
  platform: string;
  format?: string;
  ad_creative_url?: string | null;
  ad_text?: string;
  cta?: string | null;
  first_seen_at?: string;
  last_seen_at?: string;
  is_killed?: boolean;
  lifespan_days?: number;
  raw_payload?: unknown;
  display_label?: string;
  competitor: {
    id: string;
    name: string;
    domain: string;
    logo_url?: string | null;
  };
};

type CachedEntry = {
  payload: AdDetailDrawerPayload;
  fetchedAt: number;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const detailCache = new Map<string, CachedEntry>();
const seedCache = new Map<string, AdDetailOpenSeed>();
const inflight = new Map<string, Promise<AdDetailDrawerPayload | null>>();

export function putAdDetailSeed(seed: AdDetailOpenSeed): void {
  seedCache.set(seed.adId, seed);
}

export function getAdDetailSeed(adId: string): AdDetailOpenSeed | null {
  return seedCache.get(adId) ?? null;
}

export function getCachedAdDetail(adId: string): AdDetailDrawerPayload | null {
  const hit = detailCache.get(adId);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > CACHE_TTL_MS) {
    detailCache.delete(adId);
    return null;
  }
  return hit.payload;
}

export function setCachedAdDetail(adId: string, payload: AdDetailDrawerPayload): void {
  if (!payload.ok) return;
  detailCache.set(adId, { payload, fetchedAt: Date.now() });
}

/** Keep in-memory drawer cache in sync after a successful AI analysis save. */
export function patchCachedAdDetailAnalysis(
  adId: string,
  patch: Partial<NonNullable<AdDetailDrawerPayload["context"]>>,
): void {
  const hit = detailCache.get(adId);
  if (!hit?.payload.ok || !hit.payload.ad || !hit.payload.competitor) return;
  setCachedAdDetail(adId, {
    ...hit.payload,
    context: {
      ...hit.payload.context,
      ...patch,
    },
  });
}

export async function fetchAdDetailPayload(adId: string): Promise<AdDetailDrawerPayload | null> {
  const existing = inflight.get(adId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch(`/api/ad-detail?adId=${encodeURIComponent(adId)}`, {
        credentials: "include",
      });
      const json = (await res.json()) as AdDetailDrawerPayload;
      if (json.ok) setCachedAdDetail(adId, json);
      return json;
    } catch {
      return null;
    } finally {
      inflight.delete(adId);
    }
  })();

  inflight.set(adId, promise);
  return promise;
}

/** Fire-and-forget warm cache (deduped). */
export function prefetchAdDetail(adId: string): void {
  if (getCachedAdDetail(adId)) return;
  void fetchAdDetailPayload(adId);
}
