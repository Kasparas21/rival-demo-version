import { prefetchScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import { normalizeCompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";

type PrefetchParams = {
  cacheDomainNorm: string;
  competitorDomain: string;
  competitorId: string;
  scrapeStamp: string;
  brandId?: string;
  isOwnWorkspace?: boolean;
};

type StrategyCompiledResponse = {
  ok?: boolean;
  payload?: unknown;
  error?: string;
};

/** Background-warm every competitor tab cache (parallel, best-effort). */
export function prefetchCompetitorFeatureCaches(params: PrefetchParams): void {
  void prefetchAllCompetitorFeatureCaches(params);
}

export async function prefetchAllCompetitorFeatureCaches(params: PrefetchParams): Promise<void> {
  const dom = params.cacheDomainNorm.trim().toLowerCase();
  const domain = params.competitorDomain.trim();
  const id = params.competitorId.trim();
  const stamp = params.scrapeStamp;
  const brandId = params.brandId?.trim() || "";
  if (!dom || !domain) return;

  const jobs: Array<Promise<void>> = [];

  jobs.push(
    prefetchScrapeKeyedCache({
      cacheKey: `${dom}:activity-feed-bootstrap:v1:${stamp}`,
      fetcher: async () => {
        const res = await fetch(
          `/api/competitor/activity-feed/bootstrap?competitorDomain=${encodeURIComponent(domain)}`,
          { credentials: "include" },
        );
        return (await res.json()) as { ok?: boolean; competitor?: unknown };
      },
      validateCached: (c) => c.ok === true && Boolean(c.competitor),
    }),
  );

  if (brandId) {
    jobs.push(
      prefetchScrapeKeyedCache({
        cacheKey: `${brandId}:${dom}:audience-summary:v1:${stamp}`,
        fetcher: async () => {
          const q = new URLSearchParams({ competitorDomain: domain });
          if (brandId !== "_workspace") q.set("brandId", brandId);
          const res = await fetch(`/api/competitor/audience-summary?${q.toString()}`, {
            credentials: "include",
          });
          return (await res.json()) as { ok?: boolean; competitor?: unknown };
        },
        validateCached: (c) => c.ok === true && Boolean(c.competitor),
      }),
    );
  }

  jobs.push(
    prefetchScrapeKeyedCache({
      cacheKey: `${dom}:strategy-compiled:v4-journey-goal:${stamp}`,
      fetcher: async () => {
        const res = await fetch(
          `/api/strategy-overview/compiled?competitorDomain=${encodeURIComponent(domain)}`,
          { credentials: "include" },
        );
        const json = (await res.json()) as StrategyCompiledResponse;
        if (!json.ok || !json.payload) {
          throw new Error(json.error ?? "strategy compile failed");
        }
        return {
          ...json,
          payload: normalizeCompetitorStrategyOverviewPayload(
            json.payload as CompetitorStrategyOverviewPayload,
          ),
        };
      },
      validateCached: (c) => {
        const p = c.payload as Record<string, unknown> | null | undefined;
        return (
          c.ok === true &&
          Boolean(p && typeof p.map === "object" && p.map != null) &&
          Object.prototype.hasOwnProperty.call(p, "channelSignals") &&
          Object.prototype.hasOwnProperty.call(p, "journeyGoal")
        );
      },
    }),
  );

  if (id) {
    jobs.push(
      prefetchScrapeKeyedCache({
        cacheKey: `${dom}:creative-tests:v5:${id}:${stamp}`,
        fetcher: async () => {
          const res = await fetch(`/api/creative-tests?competitorId=${encodeURIComponent(id)}`, {
            credentials: "include",
          });
          return (await res.json()) as { ok?: boolean; tests?: unknown[] };
        },
        validateCached: (c) => c.ok === true && Array.isArray(c.tests),
      }),

      prefetchScrapeKeyedCache({
        cacheKey: `${dom}:timeline:v3:${id}:${stamp}`,
        fetcher: async () => {
          const res = await fetch(`/api/timeline?competitorId=${encodeURIComponent(id)}`, {
            credentials: "include",
          });
          return (await res.json()) as { ok?: boolean; ads?: unknown[] };
        },
        validateCached: (c) => c.ok === true && Array.isArray(c.ads),
      }),

      prefetchScrapeKeyedCache({
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
      }),

      prefetchScrapeKeyedCache({
        cacheKey: `${dom}:landing-pages:${id}:${stamp}:100`,
        fetcher: async () => {
          const res = await fetch(
            `/api/landing-pages?competitorId=${encodeURIComponent(id)}&limit=100`,
            { credentials: "include" },
          );
          return (await res.json()) as { ok?: boolean; landingPages?: unknown[] };
        },
        validateCached: (c) => c.ok === true && Array.isArray(c.landingPages),
      }),

      prefetchScrapeKeyedCache({
        cacheKey: `${dom}:tracked-pages:${id}:${stamp}`,
        fetcher: async () => {
          const res = await fetch(`/api/competitor/${encodeURIComponent(id)}/landing-pages`, {
            credentials: "include",
          });
          return (await res.json()) as { ok?: boolean; pages?: unknown[] };
        },
        validateCached: (c) => c.ok === true && Array.isArray(c.pages),
      }),

      prefetchScrapeKeyedCache({
        cacheKey: `${dom}:tracked-changes:${id}:${stamp}`,
        fetcher: async () => {
          const res = await fetch(
            `/api/competitor/${encodeURIComponent(id)}/landing-pages/changes?limit=20`,
            { credentials: "include" },
          );
          return (await res.json()) as { ok?: boolean; changes?: unknown[] };
        },
        validateCached: (c) => c.ok === true && Array.isArray(c.changes),
      }),
    );
  }

  if (brandId && brandId !== "_workspace" && !params.isOwnWorkspace) {
    jobs.push(
      prefetchScrapeKeyedCache({
        cacheKey: `${brandId}:${dom}:comparison-payload:v2:${stamp}`,
        fetcher: async () => {
          const q = new URLSearchParams({ competitorDomain: domain, brandId });
          const res = await fetch(`/api/comparison/payload?${q.toString()}`, {
            credentials: "include",
          });
          return (await res.json()) as { ok?: boolean; competitor?: { payload?: { map?: unknown } } };
        },
        validateCached: (c) =>
          c.ok === true &&
          Boolean(c.competitor?.payload?.map) &&
          typeof (c.competitor as { derivedStats?: { avgAdAgeDays?: number } })?.derivedStats
            ?.avgAdAgeDays === "number",
      }),
    );
  }

  if (brandId && params.isOwnWorkspace) {
    jobs.push(
      prefetchScrapeKeyedCache({
        cacheKey: `${brandId}:${dom}:benchmark:v2:${stamp}`,
        fetcher: async () => {
          const qs = brandId ? `?brandId=${encodeURIComponent(brandId)}` : "";
          const res = await fetch(`/api/brand/benchmark${qs}`, { credentials: "include" });
          return (await res.json()) as { ok?: boolean; hero?: unknown };
        },
        validateCached: (c) => c.ok === true && Boolean(c.hero),
      }),
    );
  }

  await Promise.allSettled(jobs);
}

type PaidMediaSubTabPrefetchParams = {
  cacheDomainNorm: string;
  competitorId: string;
  scrapeStamp: string;
};

/** Background-warm only the Paid Media sub-tab caches (timeline + creative tests). */
export function prefetchPaidMediaSubTabCaches(params: PaidMediaSubTabPrefetchParams): void {
  const dom = params.cacheDomainNorm.trim().toLowerCase();
  const id = params.competitorId.trim();
  const stamp = params.scrapeStamp;
  if (!dom || !id) return;

  void Promise.allSettled([
    prefetchScrapeKeyedCache({
      cacheKey: `${dom}:creative-tests:v5:${id}:${stamp}`,
      fetcher: async () => {
        const res = await fetch(`/api/creative-tests?competitorId=${encodeURIComponent(id)}`, {
          credentials: "include",
        });
        return (await res.json()) as { ok?: boolean; tests?: unknown[] };
      },
      validateCached: (c) => c.ok === true && Array.isArray(c.tests),
    }),

    prefetchScrapeKeyedCache({
      cacheKey: `${dom}:timeline:v3:${id}:${stamp}`,
      fetcher: async () => {
        const res = await fetch(`/api/timeline?competitorId=${encodeURIComponent(id)}`, {
          credentials: "include",
        });
        return (await res.json()) as { ok?: boolean; ads?: unknown[] };
      },
      validateCached: (c) => c.ok === true && Array.isArray(c.ads),
    }),
  ]);
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
