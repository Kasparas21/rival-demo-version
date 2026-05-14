"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import {
  angleCategoryPill,
  classifyAngleCategory,
  type AngleCardCategory,
} from "@/lib/comparison/stealable-angle-present";
import { RivalLoadingRow } from "@/components/ui/rival-loading";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import {
  isAdSaved,
  PENDING_SAVED_AD_ID,
  useSavedAdsStatus,
} from "@/lib/saved-ads/use-saved-ads";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

export type VaultAdRow = {
  id: string;
  platform: string;
  format: string;
  ad_text: string;
  first_seen_at: string;
  last_seen_at: string;
  ai_extracted_angle: string | null;
  ad_creative_url: string | null;
  funnel_stage: string | null;
  lifespanDays: number;
};

type VaultApiResponse = {
  ok?: boolean;
  ads?: VaultAdRow[];
  total?: number;
  minLifespanUsed?: number;
  error?: string;
};

type SortKey = "lifespan_desc" | "lifespan_asc" | "newest" | "platform" | "angle";

type Props = {
  competitorId: string;
  competitorLabel: string;
  standaloneMode?: boolean;
  onOpenAd?: (adId: string) => void;
  cacheDomainNorm?: string | null;
  /** Account scrape stamp — cache key bumps when new scrape lands. */
  lastScrapedAt?: string | null;
};

const PLATFORMS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "meta", label: "Meta" },
  { id: "google", label: "Google" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "pinterest", label: "Pinterest" },
  { id: "snapchat", label: "Snapchat" },
];

const ANGLE_CAT_VALUES: AngleCardCategory[] = [
  "price",
  "discount",
  "fear",
  "urgency",
  "social_proof",
  "speed",
  "curiosity",
  "brand",
  "other",
];
const ANGLE_CAT_SET = new Set<string>(ANGLE_CAT_VALUES);

const FUNNELS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "TOF", label: "Top" },
  { id: "MOF", label: "Middle" },
  { id: "BOF", label: "Bottom" },
];

function pl(p: string): StrategyPlatform | null {
  const x = p.toLowerCase();
  if (x === "meta" || x === "google" || x === "tiktok" || x === "linkedin" || x === "pinterest" || x === "snapchat") {
    return x;
  }
  return null;
}

function normalizeFunnel(raw: string | null): string {
  const s = (raw ?? "").toUpperCase().trim();
  if (s === "TOF" || s === "MOF" || s === "BOF") return s;
  return "MOF";
}

function parseAngleFromUrl(q: string | null): string {
  return (q ?? "").trim();
}

function sortAds(rows: VaultAdRow[], sort: SortKey): VaultAdRow[] {
  const r = [...rows];
  switch (sort) {
    case "lifespan_asc":
      return r.sort((a, b) => a.lifespanDays - b.lifespanDays);
    case "newest":
      return r.sort((a, b) => Date.parse(b.first_seen_at) - Date.parse(a.first_seen_at));
    case "platform":
      return r.sort((a, b) => a.platform.localeCompare(b.platform));
    case "angle":
      return r.sort((a, b) => (a.ai_extracted_angle ?? "").localeCompare(b.ai_extracted_angle ?? ""));
    default:
      return r.sort((a, b) => b.lifespanDays - a.lifespanDays);
  }
}

/** First line as "hook" — heuristic on ad_text */
function hookFromText(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "—";
  const line = t.split(/\n+/)[0] ?? t;
  return line.length > 160 ? line.slice(0, 157) + "…" : line;
}

export function CopyVaultPanel({
  competitorId,
  competitorLabel,
  standaloneMode = false,
  onOpenAd,
  cacheDomainNorm,
  lastScrapedAt = null,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const stamp = lastScrapedAt ?? "none";
  const dom = (cacheDomainNorm ?? "").trim().toLowerCase();
  const cacheKey = dom ? `${dom}:copy-vault:${competitorId}:${stamp}` : `copy-vault:${competitorId}:${stamp}`;

  const fetchVault = useCallback(async (_opts?: { force?: boolean }) => {
    const u = new URL("/api/comparison/vault-ads", window.location.origin);
    u.searchParams.set("competitorId", competitorId);
    u.searchParams.set("vault", "1");
    u.searchParams.set("limit", "1500");
    u.searchParams.set("offset", "0");
    u.searchParams.set("sort", "lifespan_desc");
    const res = await fetch(u.toString(), { credentials: "include" });
    const json = (await res.json()) as VaultApiResponse;
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? "Failed to load copy vault");
    }
    return json;
  }, [competitorId]);

  const {
    data: vaultPayload,
    loading: vaultLoading,
    error: vaultError,
    refetch: refetchVault,
  } = useScrapeKeyedCache<VaultApiResponse>({
    cacheKey,
    enabled: Boolean(competitorId.trim() && standaloneMode),
    validateCached: (c) => c.ok === true && Array.isArray(c.ads),
    fetcher: fetchVault,
  });

  const rawAds = vaultPayload?.ads ?? null;
  const serverTotal = vaultPayload?.total ?? 0;
  const minLifespanUsed = vaultPayload?.minLifespanUsed ?? 30;

  const urlPlatform = (searchParams.get("platform") ?? "all").toLowerCase();
  const urlFunnel = (searchParams.get("funnel") ?? "all").toUpperCase();
  const urlAngleExact = parseAngleFromUrl(searchParams.get("angle"));
  const urlAnglePick = (searchParams.get("anglePick") ?? "all").trim();
  const urlAngleQ = (searchParams.get("angleQ") ?? "").trim();
  const rawAngleCat = (searchParams.get("angleCat") ?? "").trim().toLowerCase();
  const urlAngleCat: AngleCardCategory | null = ANGLE_CAT_SET.has(rawAngleCat)
    ? (rawAngleCat as AngleCardCategory)
    : null;
  const urlSort = (searchParams.get("sort") ?? "lifespan_desc") as SortKey;
  const sortSafe: SortKey =
    urlSort === "lifespan_asc" || urlSort === "newest" || urlSort === "platform" || urlSort === "angle"
      ? urlSort
      : "lifespan_desc";

  const [savedOnly, setSavedOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [expandIds, setExpandIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!standaloneMode || !competitorId.trim()) return;
    const p = new URLSearchParams(searchParams.toString());
    let changed = false;
    const plat = (p.get("platform") ?? "all").toLowerCase();
    if (plat !== "all" && !PLATFORMS.some((x) => x.id === plat)) {
      p.delete("platform");
      changed = true;
    }
    const fun = (p.get("funnel") ?? "all").toUpperCase();
    if (fun !== "ALL" && fun !== "all" && !FUNNELS.some((f) => f.id === fun)) {
      p.delete("funnel");
      changed = true;
    }
    const ac = (p.get("angleCat") ?? "").trim().toLowerCase();
    if (ac && !ANGLE_CAT_SET.has(ac)) {
      p.delete("angleCat");
      changed = true;
    }
    if (changed) {
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }
  }, [competitorId, pathname, router, searchParams, standaloneMode]);

  useEffect(() => {
    setVisibleCount(20);
  }, [urlPlatform, urlFunnel, urlAngleExact, urlAnglePick, urlAngleQ, urlAngleCat, sortSafe, savedOnly, competitorId]);

  const scrapedIds = useMemo(() => (rawAds ?? []).map((a) => a.id), [rawAds]);
  const { savedMap, saveAd, unsaveAd, loading: savedLoading } = useSavedAdsStatus(
    competitorId,
    [],
    scrapedIds,
    cacheDomainNorm ?? null
  );

  const savedCount = useMemo(() => Object.keys(savedMap).filter((k) => savedMap[k] !== PENDING_SAVED_AD_ID).length, [savedMap]);

  const filterPlatform = urlPlatform === "all" ? null : urlPlatform;
  const filterFunnel = urlFunnel === "ALL" || urlFunnel === "all" ? null : urlFunnel;

  const angleCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of rawAds ?? []) {
      const ang = a.ai_extracted_angle?.trim();
      if (!ang) continue;
      m.set(ang, (m.get(ang) ?? 0) + 1);
    }
    return [...m.entries()].sort((x, y) => y[1] - x[1]);
  }, [rawAds]);

  const topAngles = useMemo(() => angleCounts.slice(0, 8), [angleCounts]);

  const filteredAds = useMemo(() => {
    if (!rawAds) return [];
    let rows = rawAds;
    if (filterPlatform) {
      rows = rows.filter((a) => (a.platform ?? "").toLowerCase() === filterPlatform);
    }
    if (filterFunnel) {
      rows = rows.filter((a) => normalizeFunnel(a.funnel_stage) === filterFunnel);
    }
    if (urlAngleExact) {
      const exactRows = rows.filter((a) => a.ai_extracted_angle === urlAngleExact);
      rows =
        exactRows.length > 0
          ? exactRows
          : rows.filter((a) =>
              (a.ai_extracted_angle ?? "").toLowerCase().includes(urlAngleExact.toLowerCase())
            );
    } else {
      if (urlAngleQ) {
        const q = urlAngleQ.toLowerCase();
        rows = rows.filter((a) => (a.ai_extracted_angle ?? "").toLowerCase().includes(q));
      } else if (urlAnglePick && urlAnglePick !== "all") {
        rows = rows.filter((a) => a.ai_extracted_angle === urlAnglePick);
      }
    }
    if (urlAngleCat) {
      rows = rows.filter((a) => classifyAngleCategory(a.ai_extracted_angle ?? "") === urlAngleCat);
    }
    rows = sortAds(rows, sortSafe);
    if (savedOnly) {
      rows = rows.filter((a) => isAdSaved(savedMap, a.id));
    }
    return rows;
  }, [rawAds, filterPlatform, filterFunnel, urlAngleExact, urlAnglePick, urlAngleQ, urlAngleCat, sortSafe, savedOnly, savedMap]);

  const visibleAds = useMemo(() => filteredAds.slice(0, visibleCount), [filteredAds, visibleCount]);

  const patchQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "" || v === "all") {
          if (k === "sort") p.set("sort", "lifespan_desc");
          else p.delete(k);
        } else {
          p.set(k, v);
        }
      }
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const hasActiveFilters =
    filterPlatform !== null ||
    (filterFunnel !== null && filterFunnel !== "ALL") ||
    urlAngleExact !== "" ||
    urlAngleQ !== "" ||
    urlAngleCat !== null ||
    (urlAnglePick !== "" && urlAnglePick !== "all") ||
    sortSafe !== "lifespan_desc";

  const clearFilters = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("platform");
    p.delete("funnel");
    p.delete("angle");
    p.delete("anglePick");
    p.delete("angleQ");
    p.delete("angleCat");
    p.delete("sort");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    setSavedOnly(false);
  };

  if (!standaloneMode) {
    return null;
  }

  if (!competitorId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
        Select a competitor to see their copy vault.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FeatureSectionHeader
        overline="Copy vault"
        title="Their longest-running creatives"
        description={
          !rawAds && vaultLoading ? (
            "Loading…"
          ) : (
            <>
              Showing {visibleAds.length} of {filteredAds.length} matching ads
              {serverTotal ? ` · ${serverTotal} enriched in library` : null}
              {minLifespanUsed === 0 ? " · including shorter runs (limited sample)" : null}
              {" · "}
              sorted by{" "}
              {sortSafe === "lifespan_desc"
                ? "lifespan (longest first)"
                : sortSafe.replace(/_/g, " ")}
            </>
          )
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Filters</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="w-full text-[12px] font-medium text-slate-500">Platform</span>
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => patchQuery({ platform: p.id === "all" ? null : p.id })}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                (p.id === "all" ? urlPlatform === "all" : urlPlatform === p.id)
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="w-full text-[12px] font-medium text-slate-500">Funnel</span>
          {FUNNELS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => patchQuery({ funnel: f.id === "all" ? null : f.id })}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                (f.id === "all" ? !filterFunnel : filterFunnel === f.id)
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="w-full text-[12px] font-medium text-slate-500">Angle</span>
          <button
            type="button"
            onClick={() => patchQuery({ angle: null, anglePick: "all" })}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              !urlAngleExact && urlAnglePick === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            All
          </button>
          {topAngles.map(([ang]) => (
            <button
              key={ang.slice(0, 120)}
              type="button"
              onClick={() => patchQuery({ angle: null, anglePick: ang })}
              className={cn(
                "max-w-[200px] truncate rounded-full px-3 py-1 text-xs font-semibold transition",
                urlAnglePick === ang
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
              title={ang}
            >
              {ang.slice(0, 40)}
              {ang.length > 40 ? "…" : ""}
            </button>
          ))}
          {angleCounts.length > 8 ? (
            <select
              className="max-w-[220px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800"
              value={urlAnglePick !== "all" && !topAngles.some(([a]) => a === urlAnglePick) ? urlAnglePick : ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v) patchQuery({ anglePick: v });
              }}
            >
              <option value="">+ More angles…</option>
              {angleCounts.slice(8).map(([ang]) => (
                <option key={ang.slice(0, 80)} value={ang}>
                  {ang.slice(0, 60)}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span>Sort</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-900"
              value={sortSafe}
              onChange={(e) => patchQuery({ sort: e.target.value })}
            >
              <option value="lifespan_desc">Lifespan ↓</option>
              <option value="lifespan_asc">Lifespan ↑</option>
              <option value="newest">Newest</option>
              <option value="platform">Platform</option>
              <option value="angle">Angle</option>
            </select>
          </label>
          <button
            type="button"
            disabled={savedCount === 0}
            title={savedCount === 0 ? "Save ads to build your swipe file" : undefined}
            onClick={() => setSavedOnly((s) => !s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              savedOnly ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-800",
              savedCount === 0 && "cursor-not-allowed opacity-50"
            )}
          >
            Saved only ({savedCount})
          </button>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {vaultError ? (
        <p className="text-sm text-red-700">{vaultError.message}</p>
      ) : vaultLoading && !rawAds ? (
        <div className="flex justify-center py-14">
          <RivalLoadingRow label="Loading copy vault…" description="Pulling enriched, long-running creatives." />
        </div>
      ) : !rawAds?.length ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-600">
          {minLifespanUsed === 0
            ? "Ads are being analyzed. Check back after the next scrape, or widen filters above."
            : "No qualifying enriched ads yet. Run a scrape and wait for enrichment."}
          <button
            type="button"
            onClick={() => void refetchVault({ force: true })}
            className="mt-3 block w-full text-center text-xs font-semibold text-slate-900 underline"
          >
            Refresh
          </button>
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-700">
          No ads match these filters.
          <button type="button" className="ml-2 font-semibold underline" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visibleAds.map((ad) => {
            const platform = pl(ad.platform);
            const pill = ad.ai_extracted_angle ? angleCategoryPill(ad.ai_extracted_angle) : null;
            const funnel = normalizeFunnel(ad.funnel_stage);
            const saved = isAdSaved(savedMap, ad.id);
            const expanded = expandIds.has(ad.id);
            const life = Math.round(ad.lifespanDays ?? 0);
            const lifeCls =
              life > 60 ? "bg-slate-800/95 text-white" : life >= 30 ? "bg-slate-600/95 text-white" : "bg-slate-500/90 text-white";

            return (
              <div
                key={ad.id}
                className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-100">
                  {ad.ad_creative_url ? (
                    <img
                      src={ad.ad_creative_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                      {platform ? (
                        <ComparisonPlatformIcon platform={platform} className="h-12 w-12 text-slate-400" />
                      ) : (
                        <span className="text-xs font-medium capitalize text-slate-500">{ad.platform}</span>
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      lifeCls
                    )}
                  >
                    ●{life}d
                  </div>
                  <div className="absolute left-2 top-2 flex items-center gap-1">
                    {platform ? (
                      <span className="rounded-md bg-white/95 p-1 shadow-sm ring-1 ring-slate-200/80">
                        <ComparisonPlatformIcon platform={platform} className="h-4 w-4" />
                      </span>
                    ) : null}
                    <span className="rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm ring-1 ring-slate-200/80">
                      {funnel}
                    </span>
                  </div>
                </div>

                {pill ? (
                  <span
                    className={cn(
                      "mt-3 inline-flex self-start rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      pill.className
                    )}
                  >
                    {pill.label}
                  </span>
                ) : null}

                <p className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-slate-900">{hookFromText(ad.ad_text)}</p>

                <button
                  type="button"
                  onClick={() =>
                    setExpandIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(ad.id)) next.delete(ad.id);
                      else next.add(ad.id);
                      return next;
                    })
                  }
                  className="mt-2 text-left"
                >
                  <p
                    className={cn(
                      "text-sm leading-relaxed text-slate-600 transition-[max-height]",
                      expanded ? "line-clamp-none" : "line-clamp-3"
                    )}
                  >
                    {ad.ad_text?.trim() || "—"}
                  </p>
                  <span className="mt-1 text-[11px] font-semibold text-slate-500">{expanded ? "Show less" : "Expand copy"}</span>
                </button>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={savedLoading}
                    onClick={async () => {
                      if (saved) await unsaveAd(ad.id);
                      else await saveAd({ scrapedAdId: ad.id });
                    }}
                    className={cn(
                      "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition",
                      saved ? "border-slate-300 bg-slate-100 text-slate-900" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                    )}
                  >
                    <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-slate-800 text-slate-800")} />
                    {saved ? "Saved" : "Save"}
                  </button>
                  {onOpenAd ? (
                    <button
                      type="button"
                      onClick={() => onOpenAd(ad.id)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:opacity-95"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Open
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredAds.length > visibleCount ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + 20)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Load more ({filteredAds.length - visibleCount} remaining)
          </button>
        </div>
      ) : filteredAds.length > 0 && visibleAds.length >= filteredAds.length ? (
        <p className="text-center text-xs text-slate-500">Showing all {filteredAds.length} matching ads</p>
      ) : null}
    </div>
  );
}
