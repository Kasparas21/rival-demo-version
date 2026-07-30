"use client";

/**
 * Foreplay-style Landing Pages explorer.
 * - List from /api/landing-pages; preview via stored screenshots (blocked-only fallback).
 * - "Ads using this page" uses /api/landing-pages/ads-for-url.
 */

import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Play,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { CacheRevalidatingDot } from "@/components/competitor/data-freshness-badge";
import { COMPETITOR_PAGE_SHELL, COMPETITOR_PAGE_X } from "@/components/dashboard/competitor/competitor-page-layout";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import {
  LandingPagePreviewFallbackCard,
  LandingPagePreviewStartCard,
} from "@/components/competitor/landing-page-preview-fallback";
import { FromAdsSkeleton } from "@/components/website-tracker/website-tracker-skeletons";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import { displayUrlShort } from "@/lib/landing-pages/normalize-url";
import { cn } from "@/lib/utils";

/** Brand colors for platform breakdown bars (same family as Analytics gauge). */
const PLATFORM_BAR_COLORS: Record<string, string> = {
  meta: "#1877F2",
  google: "#34A853",
  tiktok: "#000000",
  linkedin: "#0A66C2",
  pinterest: "#E60023",
  snapchat: "#FFFC00",
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
  youtube: "YouTube",
  microsoft: "Microsoft",
};

const PLATFORM_SORT_ORDER = ["meta", "google", "tiktok", "linkedin", "pinterest", "snapchat", "youtube", "microsoft"];

/** Sidebar list: show this many URLs before "Show more". */
const LANDING_PAGES_LIST_INITIAL = 8;
/** Max characters for URL text in the sidebar list row. */
const LANDING_PAGES_URL_DISPLAY_MAX = 36;
/** Ads grid: one row on desktop (4 cols) before "Show more". */
const LANDING_PAGE_ADS_INITIAL = 4;

type LandingPageSnapshotRef = {
  hero_screenshot_url: string | null;
  screenshot_url: string;
  status: "ok" | "blocked";
  taken_at: string;
  inheritedBlocked?: boolean;
};

type LandingPageRow = {
  groupId: string;
  url: string;
  displayUrl: string;
  count: number;
  host: string;
  faviconUrl: string;
  totalAds: number;
  platformBreakdown: Record<string, number>;
  snapshot: LandingPageSnapshotRef | null;
  isTracking: boolean;
};

export type LandingPagesApiResponse = {
  ok: boolean;
  competitor?: { id: string; name: string; lastScrapedAt: string | null };
  landingPages?: LandingPageRow[];
  error?: string;
};

export type SharedLandingPagesListCache = {
  data: LandingPagesApiResponse | null;
  loading: boolean;
  isValidating: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

type AdsForUrlResponse = {
  ok: boolean;
  ads?: {
    id: string;
    platform: string;
    format: string;
    ad_text: string;
    ad_creative_url: string | null;
    first_seen_at: string;
    ai_extracted_angle: string | null;
  }[];
  total?: number;
};

export type LandingPagesTabProps = {
  competitorId: string;
  competitorLabel: string;
  cacheDomainNorm: string;
  lastScrapedAt?: string | null;
  onOpenAd: (adId: string) => void;
  onFreshnessRescrape?: () => void;
  /** Parent-owned list fetch (dedupes with Ads Library analytics). When set, skips internal list cache hook. */
  landingPagesListCache?: SharedLandingPagesListCache | null;
  fetchEnabled?: boolean;
};

function snapshotPreviewUrl(snapshot: LandingPageSnapshotRef | null | undefined): string | null {
  if (!snapshot) return null;
  return snapshot.hero_screenshot_url ?? snapshot.screenshot_url ?? null;
}

function formatDataSinceLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function sortedPlatformShares(breakdown: Record<string, number>): { key: string; n: number }[] {
  const entries = Object.entries(breakdown).filter(([, n]) => n > 0);
  entries.sort((a, b) => {
    const ia = PLATFORM_SORT_ORDER.indexOf(a[0]);
    const ib = PLATFORM_SORT_ORDER.indexOf(b[0]);
    const aUnknown = ia === -1;
    const bUnknown = ib === -1;
    if (aUnknown && bUnknown) return b[1] - a[1];
    if (aUnknown) return 1;
    if (bUnknown) return -1;
    if (ia !== ib) return ia - ib;
    return b[1] - a[1];
  });
  return entries.map(([key, n]) => ({ key, n }));
}

function captionTopPlatforms(breakdown: Record<string, number>, maxParts = 2): string {
  const shares = sortedPlatformShares(breakdown);
  const top = shares.slice(0, maxParts);
  return top
    .map(({ key, n }) => {
      const label = PLATFORM_LABELS[key] ?? key;
      return `${label} ${n} ${n === 1 ? "ad" : "ads"}`;
    })
    .join(" · ");
}

export function LandingPagesTab({
  competitorId,
  competitorLabel,
  cacheDomainNorm,
  lastScrapedAt = null,
  onOpenAd,
  onFreshnessRescrape,
  landingPagesListCache = null,
  fetchEnabled = true,
}: LandingPagesTabProps) {
  const domainKey = cacheDomainNorm.trim().toLowerCase();
  const stamp = lastScrapedAt ?? "none";
  const listCacheKey = `${domainKey}:landing-pages:${competitorId}:${stamp}:100`;

  const internalList = useScrapeKeyedCache<LandingPagesApiResponse>({
    cacheKey: listCacheKey,
    enabled: landingPagesListCache == null && Boolean(competitorId && domainKey && fetchEnabled),
    validateCached: (c) => c.ok === true && Array.isArray(c.landingPages),
    fetcher: async () => {
      const res = await fetch(
        `/api/landing-pages?competitorId=${encodeURIComponent(competitorId)}&limit=100`
      );
      const json = (await res.json()) as LandingPagesApiResponse;
      if (!json.ok) {
        throw new Error(json.error ?? "Failed to load landing pages");
      }
      return json;
    },
  });

  const listData = landingPagesListCache?.data ?? internalList.data;
  const listLoading = landingPagesListCache?.loading ?? internalList.loading;
  const listValidating = landingPagesListCache?.isValidating ?? internalList.isValidating;
  const listHookError = landingPagesListCache?.error ?? internalList.error;
  const refetchList = landingPagesListCache?.refetch ?? internalList.refetch;

  const rows = useMemo(() => listData?.landingPages ?? [], [listData?.landingPages]);
  const meta = listData?.competitor ?? null;
  const loadError = listHookError?.message ?? null;

  const [query, setQuery] = useState("");
  const [listExpanded, setListExpanded] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const [pageAds, setPageAds] = useState<NonNullable<AdsForUrlResponse["ads"]>>([]);
  const [pageAdsTotal, setPageAdsTotal] = useState(0);
  const [pageAdsLimit, setPageAdsLimit] = useState(30);
  const [adsExpanded, setAdsExpanded] = useState(false);
  const [adsPlatformFilter, setAdsPlatformFilter] = useState("all");
  const [captureAction, setCaptureAction] = useState<"trace" | "preview" | null>(null);

  const adsCacheKey = `${domainKey}:landing-pages-ads:${competitorId}:${encodeURIComponent(selectedUrl || "__none__")}:${stamp}:${pageAdsLimit}:${adsPlatformFilter}`;

  const { data: adsPayload, loading: adsLoading, isValidating: adsValidating } = useScrapeKeyedCache<AdsForUrlResponse>({
    cacheKey: adsCacheKey,
    enabled: Boolean(competitorId && domainKey && selectedUrl),
    validateCached: (c) => c.ok === true && Array.isArray(c.ads),
    fetcher: async () => {
      const params = new URLSearchParams({
        competitorId,
        url: selectedUrl!,
        limit: String(pageAdsLimit),
      });
      if (adsPlatformFilter !== "all") {
        params.set("platform", adsPlatformFilter);
      }
      const res = await fetch(`/api/landing-pages/ads-for-url?${params.toString()}`, {
        credentials: "include",
      });
      return (await res.json()) as AdsForUrlResponse;
    },
  });

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedUrl(null);
      return;
    }
    setSelectedUrl((prev) => {
      if (prev && rows.some((r) => r.url === prev)) return prev;
      return rows[0]!.url;
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.url.toLowerCase().includes(q) || r.host.toLowerCase().includes(q));
  }, [rows, query]);

  useEffect(() => {
    setListExpanded(false);
  }, [query]);

  const visibleRows = useMemo(() => {
    if (listExpanded) return filteredRows;
    const slice = filteredRows.slice(0, LANDING_PAGES_LIST_INITIAL);
    if (!selectedUrl || slice.some((r) => r.url === selectedUrl)) return slice;
    const selected = filteredRows.find((r) => r.url === selectedUrl);
    return selected ? [...slice, selected] : slice;
  }, [filteredRows, listExpanded, selectedUrl]);
  const hiddenRowCount = Math.max(0, filteredRows.length - LANDING_PAGES_LIST_INITIAL);
  const showListMoreControl = hiddenRowCount > 0 && !listExpanded;
  const showListLessControl = listExpanded && hiddenRowCount > 0;

  const selectedRow = useMemo(
    () => (selectedUrl ? rows.find((r) => r.url === selectedUrl) ?? null : null),
    [rows, selectedUrl],
  );

  const showAdsLoading = Boolean(
    selectedUrl && (adsLoading || (adsValidating && pageAds.length === 0)),
  );

  const runLandingCapture = useCallback(
    async (startTracking: boolean) => {
      if (!selectedUrl || !competitorId) return;
      setCaptureAction(startTracking ? "trace" : "preview");
      try {
        const res = await fetch(
          `/api/competitor/${encodeURIComponent(competitorId)}/landing-pages/capture-preview`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: selectedUrl, startTracking }),
          },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          inheritedBlocked?: boolean;
        };
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `Failed (${res.status})`);
        }
        if (json.inheritedBlocked) {
          toast.message("Can't track this site — anti-bot protection detected");
        } else {
          toast.success(
            startTracking ? "Tracing started — screenshot captured" : "Screenshot captured",
          );
        }
        await refetchList();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Capture failed");
      } finally {
        setCaptureAction(null);
      }
    },
    [competitorId, refetchList, selectedUrl],
  );

  useEffect(() => {
    setPageAds([]);
    setPageAdsTotal(0);
  }, [selectedUrl]);

  useEffect(() => {
    if (!adsPayload?.ok || !adsPayload.ads) {
      setPageAds([]);
      setPageAdsTotal(0);
      return;
    }
    setPageAds(adsPayload.ads);
    setPageAdsTotal(typeof adsPayload.total === "number" ? adsPayload.total : adsPayload.ads.length);
  }, [adsPayload]);

  useEffect(() => {
    setPageAdsLimit(30);
    setAdsExpanded(false);
    setAdsPlatformFilter("all");
  }, [selectedUrl]);

  useEffect(() => {
    setPageAdsLimit(30);
    setAdsExpanded(false);
  }, [adsPlatformFilter]);

  const copyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied URL");
    } catch {
      toast.error("Could not copy");
    }
  }, []);

  const dataSince = formatDataSinceLabel(meta?.lastScrapedAt);

  if (!competitorId) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <Globe className="mb-3 h-8 w-8 text-slate-400" />
        <p className="text-[13px] text-slate-600">Save this competitor first to view landing pages.</p>
      </div>
    );
  }

  if (listLoading && !listData && !loadError) {
    return <FromAdsSkeleton />;
  }

  if (loadError) {
    return (
      <div className={`${COMPETITOR_PAGE_X} py-6`}>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          Failed to load: {loadError}
          <button type="button" className="mt-2 block text-[12px] font-semibold underline" onClick={() => void refetchList()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={`flex w-full flex-col items-center justify-center ${COMPETITOR_PAGE_X} py-24 text-center`}>
        <Globe className="mb-4 h-12 w-12 text-slate-300" />
        <p className="max-w-md text-[14px] leading-relaxed text-slate-600">
          No landing pages detected yet. Try scraping more ads or wait for the next weekly update.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${COMPETITOR_PAGE_SHELL}`}>
      <CacheRevalidatingDot show={Boolean((listValidating && listData) || (adsValidating && adsPayload))} />
      <HeaderBar
        dataSince={dataSince}
        title="Landing Pages"
        subtitle={competitorLabel}
      />

      <div className="mt-6 flex flex-col-reverse gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-[38%]">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search URLs…"
            className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none ring-[color:var(--rival-accent-blue)]/35 placeholder:text-slate-400 focus:ring-2"
          />
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Landing pages</p>
          <div className="flex flex-col gap-3">
            {filteredRows.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-8 text-center text-[13px] text-slate-500">
                No URLs match your search.
              </div>
            ) : (
              <>
                {visibleRows.map((row) => (
                  <LandingPageListRow
                    key={row.groupId}
                    row={row}
                    selected={selectedUrl === row.url}
                    onSelect={() => setSelectedUrl(row.url)}
                  />
                ))}
                {showListMoreControl ? (
                  <button
                    type="button"
                    onClick={() => setListExpanded(true)}
                    className="rounded-lg py-2 text-left text-[12px] font-semibold text-sky-700 transition-colors hover:text-sky-800 hover:underline"
                  >
                    Show more ({hiddenRowCount})
                  </button>
                ) : null}
                {showListLessControl ? (
                  <button
                    type="button"
                    onClick={() => setListExpanded(false)}
                    className="rounded-lg py-2 text-left text-[12px] font-semibold text-sky-700 transition-colors hover:text-sky-800 hover:underline"
                  >
                    Show less
                  </button>
                ) : null}
              </>
            )}
          </div>
        </aside>

        <section className="min-w-0 flex-1 lg:w-[62%]">
          {!selectedUrl ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
              <p className="text-[14px] text-slate-600">Select a landing page to preview</p>
            </div>
          ) : (
            <>
              <PreviewPane
                url={selectedUrl}
                row={selectedRow}
                competitorLabel={competitorLabel}
                competitorDomainNorm={domainKey}
                captureAction={captureAction}
                onStartTracing={() => void runLandingCapture(true)}
                onCaptureOnly={() => void runLandingCapture(false)}
                onCopy={() => copyUrl(selectedUrl)}
              />

              {selectedRow ? (
                <AdsForPageSection
                  ads={pageAds}
                  total={showAdsLoading ? selectedRow.totalAds : pageAdsTotal}
                  loading={showAdsLoading}
                  platformBreakdown={selectedRow.platformBreakdown}
                  platformFilter={adsPlatformFilter}
                  onPlatformFilterChange={setAdsPlatformFilter}
                  expanded={adsExpanded}
                  onExpand={() => {
                    setAdsExpanded(true);
                    setPageAdsLimit(100);
                  }}
                  onCollapse={() => setAdsExpanded(false)}
                  onOpenAd={onOpenAd}
                />
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function HeaderBar({
  title,
  subtitle,
  dataSince,
}: {
  title: string;
  subtitle: string;
  dataSince: string | null;
}) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <FeatureSectionHeader
        overline="Landing pages"
        title={title}
        description={
          <>
            {subtitle}
            {dataSince ? (
              <>
                {" "}
                · Data since {dataSince}
              </>
            ) : null}
          </>
        }
      />
    </div>
  );
}

function LandingPageListRow({
  row,
  selected,
  onSelect,
}: {
  row: LandingPageRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const shares = sortedPlatformShares(row.platformBreakdown);
  const cap = captionTopPlatforms(row.platformBreakdown, 2);
  const display = displayUrlShort(row.url, LANDING_PAGES_URL_DISPLAY_MAX);
  const thumbUrl = snapshotPreviewUrl(row.snapshot);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "flex h-14 w-full min-w-0 items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-left transition-colors",
        selected
          ? "border-l-4 border-[color:var(--rival-primary)] bg-[color:var(--rival-accent-blue)]"
          : "hover:bg-slate-50",
      ].join(" ")}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center self-center overflow-hidden rounded-md border border-slate-200/80 bg-slate-100">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- stored screenshot URL
          <img src={thumbUrl} alt="" className="h-full w-full object-cover object-top" />
        ) : faviconFailed ? (
          <Globe className="h-4 w-4 text-slate-400" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- remote favicons; sizes unknown
          <img
            src={row.faviconUrl}
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 object-contain"
            onError={() => setFaviconFailed(true)}
          />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-slate-900" title={row.url}>
            {display}
          </span>
          {row.isTracking ? (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
              title="Spying on this page"
              aria-label="Spying on this page"
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          ) : null}
          <span className="shrink-0 text-[13px] font-bold text-[color:var(--rival-primary)]">{row.count}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
            {shares.map(({ key, n }) => (
              <div
                key={key}
                className="h-full min-w-[2px]"
                style={{
                  width: `${(n / row.count) * 100}%`,
                  backgroundColor: PLATFORM_BAR_COLORS[key] ?? "#94a3b8",
                  boxShadow: key === "snapchat" ? "inset 0 0 0 1px rgba(0,0,0,0.12)" : undefined,
                }}
                title={`${PLATFORM_LABELS[key] ?? key}: ${n}`}
              />
            ))}
          </div>
        </div>
        <p className="mt-0.5 text-[10px] text-slate-500">{cap}</p>
      </div>
    </button>
  );
}

function PreviewPane({
  url,
  row,
  competitorLabel,
  competitorDomainNorm,
  captureAction = null,
  onStartTracing,
  onCaptureOnly,
  onCopy,
}: {
  url: string;
  row: LandingPageRow | null;
  competitorLabel: string;
  competitorDomainNorm: string;
  captureAction?: "trace" | "preview" | null;
  onStartTracing: () => void;
  onCaptureOnly: () => void;
  onCopy: () => void;
}) {
  const displayPath = url.replace(/^https?:\/\//, "");
  const displayUrlShortText = displayPath.length > 42 ? `${displayPath.slice(0, 41)}…` : displayPath;
  const snapshot = row?.snapshot ?? null;
  const previewUrl = snapshotPreviewUrl(snapshot);
  const isBlocked = snapshot?.status === "blocked";

  if (isBlocked) {
    return (
      <div className="flex w-full flex-col items-stretch">
        <PreviewUrlBar url={url} displayUrlShortText={displayUrlShortText} onCopy={onCopy} />
        <div className="flex min-h-[400px] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 px-6 py-10">
          <LandingPagePreviewFallbackCard
            url={url}
            displayPath={displayPath}
            faviconUrl={row?.faviconUrl ?? null}
            competitorLabel={competitorLabel}
            competitorDomainNorm={competitorDomainNorm}
            inheritedBlocked={snapshot?.inheritedBlocked}
          />
        </div>
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div className="flex w-full flex-col items-stretch">
        <PreviewUrlBar url={url} displayUrlShortText={displayUrlShortText} onCopy={onCopy} />
        <div className="flex min-h-[400px] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 px-6 py-10">
          <LandingPagePreviewStartCard
            url={url}
            displayPath={displayPath}
            faviconUrl={row?.faviconUrl ?? null}
            competitorLabel={competitorLabel}
            competitorDomainNorm={competitorDomainNorm}
            capturingMode={captureAction}
            onStartTracing={onStartTracing}
            onCaptureOnly={onCaptureOnly}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-stretch">
      <PreviewUrlBar url={url} displayUrlShortText={displayUrlShortText} onCopy={onCopy} />

      <div className="flex w-full min-w-0 justify-center">
        <div
          className="relative w-full max-w-[960px] overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.1)]"
          style={{ maxHeight: "min(72vh, 720px)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- stored screenshot URL */}
          <img
            src={snapshot?.screenshot_url ?? previewUrl}
            alt={`Screenshot of ${displayPath}`}
            className="block w-full bg-white"
          />
        </div>
      </div>
    </div>
  );
}

function PreviewUrlBar({
  url,
  displayUrlShortText,
  onCopy,
}: {
  url: string;
  displayUrlShortText: string;
  onCopy: () => void;
}) {
  return (
    <div className="mb-4 flex w-full flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-1 basis-[200px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
        <span className="truncate font-mono text-[11px] text-slate-700" title={url}>
          {displayUrlShortText}
        </span>
      </div>

      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        aria-label="Copy URL"
      >
        <Copy className="h-4 w-4" />
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[color:var(--rival-primary)] px-3 py-2 text-[11px] font-semibold text-white hover:opacity-90"
      >
        Open
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function isVideoAd(format: string, creativeUrl: string | null): boolean {
  const f = format.toLowerCase();
  if (f.includes("video")) return true;
  const u = (creativeUrl ?? "").toLowerCase();
  return /\.(mp4|webm|mov)(\?|$)/i.test(u);
}

function AdsForPageSection({
  ads,
  total,
  loading = false,
  platformBreakdown,
  platformFilter,
  onPlatformFilterChange,
  expanded,
  onExpand,
  onCollapse,
  onOpenAd,
}: {
  ads: NonNullable<AdsForUrlResponse["ads"]>;
  total: number;
  loading?: boolean;
  platformBreakdown: Record<string, number>;
  platformFilter: string;
  onPlatformFilterChange: (platform: string) => void;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onOpenAd: (id: string) => void;
}) {
  const platformOptions = useMemo(() => {
    const shares = sortedPlatformShares(platformBreakdown);
    return shares.map(({ key, n }) => ({
      id: key,
      label: PLATFORM_LABELS[key] ?? key,
      count: n,
    }));
  }, [platformBreakdown]);

  const showPlatformFilter = platformOptions.length > 1;
  const allCount = useMemo(
    () => Object.values(platformBreakdown).reduce((sum, n) => sum + n, 0),
    [platformBreakdown],
  );

  if (!loading && ads.length === 0 && !showPlatformFilter) return null;

  const showCount = expanded ? ads.length : Math.min(LANDING_PAGE_ADS_INITIAL, ads.length);
  const visible = ads.slice(0, showCount);
  const hiddenCount = Math.max(0, total - LANDING_PAGE_ADS_INITIAL);
  const showMoreControl = !loading && !expanded && hiddenCount > 0 && ads.length > 0;
  const showLessControl = !loading && expanded && hiddenCount > 0;

  return (
    <div className="mt-8 w-full border-t border-slate-100 pt-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-slate-900">Ads using this page</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-bold text-[color:var(--rival-primary)]">
          {total}
        </span>
      </div>

      {showPlatformFilter ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onPlatformFilterChange("all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition",
              platformFilter === "all"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            All
            <span
              className={cn(
                "rounded-full px-1.5 py-0 text-[10px] font-bold tabular-nums",
                platformFilter === "all" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700",
              )}
            >
              {allCount}
            </span>
          </button>
          {platformOptions.map((platform) => {
            const active = platformFilter === platform.id;
            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => onPlatformFilterChange(platform.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition",
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                <ComparisonPlatformIcon platform={platform.id as StrategyPlatform} className="h-3.5 w-3.5" />
                {platform.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0 text-[10px] font-bold tabular-nums",
                    active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700",
                  )}
                >
                  {platform.count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {ads.length === 0 && !loading ? (
        <p className="py-6 text-center text-[13px] text-slate-500">No ads for this platform.</p>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: LANDING_PAGE_ADS_INITIAL }).map((_, i) => (
            <LandingPageAdCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((ad) => (
              <LandingPageAdCard key={ad.id} ad={ad} onOpen={() => onOpenAd(ad.id)} />
            ))}
          </div>
          {showMoreControl ? (
            <button
              type="button"
              onClick={onExpand}
              className="mt-4 text-[12px] font-semibold text-sky-700 transition-colors hover:text-sky-800 hover:underline"
            >
              Show more ({hiddenCount})
            </button>
          ) : null}
          {showLessControl ? (
            <button
              type="button"
              onClick={onCollapse}
              className="mt-4 text-[12px] font-semibold text-sky-700 transition-colors hover:text-sky-800 hover:underline"
            >
              Show less
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

function LandingPageAdCardSkeleton() {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white animate-pulse">
      <div className="relative bg-gradient-to-br from-slate-100 to-slate-200/80">
        <div className="aspect-[4/5] w-full" />
        <span className="absolute right-2 top-2 h-6 w-6 rounded-full bg-slate-200/90" />
      </div>
      <div className="flex min-h-[52px] flex-col justify-center gap-2 border-t border-slate-100 px-2.5 py-2">
        <div className="h-3 w-full rounded bg-slate-200" />
        <div className="h-2.5 w-2/3 rounded bg-slate-100" />
      </div>
    </div>
  );
}

function LandingPageAdCard({
  ad,
  onOpen,
}: {
  ad: NonNullable<AdsForUrlResponse["ads"]>[number];
  onOpen: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const creativeUrl = ad.ad_creative_url?.trim() ?? "";
  const hasCreative = Boolean(creativeUrl) && !imageFailed;
  const isVideo = isVideoAd(ad.format, creativeUrl);
  const previewText = (ad.ad_text ?? "").trim();
  const angle = (ad.ai_extracted_angle ?? "").trim();

  useEffect(() => {
    setImageFailed(false);
  }, [ad.id, creativeUrl]);

  return (
    <button
      type="button"
      onClick={onOpen}
      title={previewText.slice(0, 120)}
      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.1)]"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200/80">
        <div className="aspect-[4/5] w-full">
          {hasCreative ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote creative CDN URLs
            <img
              src={creativeUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 py-4 text-center">
              <ComparisonPlatformIcon
                platform={ad.platform as StrategyPlatform}
                className="h-7 w-7 opacity-50"
              />
              {previewText ? (
                <p className="line-clamp-3 text-[10px] font-medium leading-snug text-slate-600">
                  {previewText}
                </p>
              ) : (
                <p className="text-[10px] font-medium text-slate-500">No preview</p>
              )}
            </div>
          )}
        </div>

        {hasCreative && isVideo ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/30 via-transparent to-black/5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm">
              <Play className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden />
            </span>
          </span>
        ) : null}

        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm">
          <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="flex min-h-[52px] flex-col justify-center gap-0.5 border-t border-slate-100 px-2.5 py-2">
        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-slate-800">
          {previewText || "Untitled ad"}
        </p>
        {angle ? (
          <p className="line-clamp-1 text-[10px] text-slate-500">{angle}</p>
        ) : (
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {isVideo ? "Video" : "Image"} · {PLATFORM_LABELS[ad.platform] ?? ad.platform}
          </p>
        )}
      </div>
    </button>
  );
}
