import { prefetchScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";

type PrefetchParams = {
  cacheDomainNorm: string;
  competitorDomain: string;
  competitorId: string;
  scrapeStamp: string;
};

function scheduleIdle(work: () => void): void {
  if (typeof window === "undefined") return;
  const ric = window.requestIdleCallback;
  if (typeof ric === "function") {
    ric(work, { timeout: 2500 });
  } else {
    window.setTimeout(work, 80);
  }
}

/** Background-warm caches for likely next tabs (best-effort, deduped by session cache). */
export function prefetchCompetitorFeatureCaches(params: PrefetchParams): void {
  const dom = params.cacheDomainNorm.trim().toLowerCase();
  const domain = params.competitorDomain.trim();
  const id = params.competitorId.trim();
  const stamp = params.scrapeStamp;
  if (!dom || !domain) return;

  scheduleIdle(() => {
    void prefetchScrapeKeyedCache({
      cacheKey: `${dom}:activity-feed-bootstrap:v1:${stamp}`,
      fetcher: async () => {
        const res = await fetch(
          `/api/competitor/activity-feed/bootstrap?competitorDomain=${encodeURIComponent(domain)}`,
          { credentials: "include" }
        );
        return (await res.json()) as { ok?: boolean; competitor?: unknown };
      },
      validateCached: (c) => c.ok === true && Boolean(c.competitor),
    });

    void prefetchScrapeKeyedCache({
      cacheKey: `${dom}:audience-summary:v1:${stamp}`,
      fetcher: async () => {
        const res = await fetch(
          `/api/competitor/audience-summary?competitorDomain=${encodeURIComponent(domain)}`,
          { credentials: "include" }
        );
        return (await res.json()) as { ok?: boolean; competitor?: unknown };
      },
      validateCached: (c) => c.ok === true && Boolean(c.competitor),
    });

    if (id) {
      void prefetchScrapeKeyedCache({
        cacheKey: `${dom}:copy-vault:${id}:${stamp}`,
        fetcher: async () => {
          const u = new URL("/api/comparison/vault-ads", window.location.origin);
          u.searchParams.set("competitorId", id);
          u.searchParams.set("vault", "1");
          u.searchParams.set("limit", "400");
          u.searchParams.set("offset", "0");
          u.searchParams.set("sort", "lifespan_desc");
          const res = await fetch(u.toString(), { credentials: "include" });
          return (await res.json()) as { ok?: boolean; ads?: unknown[] };
        },
        validateCached: (c) => c.ok === true && Array.isArray(c.ads),
      });

      void prefetchScrapeKeyedCache({
        cacheKey: `${dom}:landing-pages:${id}:${stamp}:100`,
        fetcher: async () => {
          const res = await fetch(
            `/api/landing-pages?competitorId=${encodeURIComponent(id)}&limit=100`,
            { credentials: "include" }
          );
          return (await res.json()) as { ok?: boolean; landingPages?: unknown[] };
        },
        validateCached: (c) => c.ok === true && Array.isArray(c.landingPages),
      });

      void prefetchScrapeKeyedCache({
        cacheKey: `${dom}:tracked-pages:${id}:${stamp}`,
        fetcher: async () => {
          const res = await fetch(`/api/competitor/${encodeURIComponent(id)}/landing-pages`, {
            credentials: "include",
          });
          return (await res.json()) as { ok?: boolean; pages?: unknown[] };
        },
        validateCached: (c) => c.ok === true && Array.isArray(c.pages),
      });
    }
  });
}

const ENSURE_PERSISTED_PREFIX = "rival:ensure-persisted:";

export function shouldSkipEnsurePersisted(domain: string, competitorId: string, ttlMs = 5 * 60_000): boolean {
  if (typeof window === "undefined") return false;
  const key = `${ENSURE_PERSISTED_PREFIX}${domain.trim().toLowerCase()}:${competitorId.trim()}`;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < ttlMs;
  } catch {
    return false;
  }
}

export function markEnsurePersistedSuccess(domain: string, competitorId: string): void {
  if (typeof window === "undefined") return;
  const key = `${ENSURE_PERSISTED_PREFIX}${domain.trim().toLowerCase()}:${competitorId.trim()}`;
  try {
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    /* ignore quota */
  }
}
