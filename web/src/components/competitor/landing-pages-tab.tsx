"use client";

/**
 * Foreplay-style Landing Pages explorer (v1).
 * - List from /api/landing-pages; preview via iframe with CSP/X-Frame timeout fallback.
 * - "Ads using this page" uses /api/landing-pages/ads-for-url (fails silently per product spec).
 */

import {
  Copy,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { CacheRevalidatingDot, DataFreshnessBadge } from "@/components/competitor/data-freshness-badge";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";

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

const PREVIEW_MOBILE = { outerW: 383, outerH: 708, iframeW: 375, iframeH: 700 } as const;
const PREVIEW_DESKTOP = { iframeW: 1200, iframeH: 720, border: 4 } as const;

/** Viewport + iframe resize when switching mobile ↔ desktop */
const PREVIEW_VIEWPORT_TRANSITION =
  "transition-[width,height,border-radius] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none motion-reduce:duration-0 will-change-[width,height]";
const PREVIEW_IFRAME_TRANSITION =
  "transition-[width,height,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none motion-reduce:duration-0 will-change-[width,height]";
const PREVIEW_DESKTOP_SCALE_TRANSITION =
  "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none motion-reduce:duration-0";

type LandingPageRow = {
  groupId: string;
  url: string;
  displayUrl: string;
  count: number;
  host: string;
  faviconUrl: string;
  totalAds: number;
  platformBreakdown: Record<string, number>;
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
};

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
  return top.map(({ key }) => PLATFORM_LABELS[key] ?? key).join(" · ");
}

export function LandingPagesTab({
  competitorId,
  competitorLabel,
  cacheDomainNorm,
  lastScrapedAt = null,
  onOpenAd,
  onFreshnessRescrape,
  landingPagesListCache = null,
}: LandingPagesTabProps) {
  const domainKey = cacheDomainNorm.trim().toLowerCase();
  const stamp = lastScrapedAt ?? "none";
  const listCacheKey = `${domainKey}:landing-pages:${competitorId}:${stamp}:100`;

  const internalList = useScrapeKeyedCache<LandingPagesApiResponse>({
    cacheKey: listCacheKey,
    enabled: landingPagesListCache == null && Boolean(competitorId && domainKey),
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
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const [previewState, setPreviewState] = useState<"loading" | "ok" | "blocked">("loading");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pageAds, setPageAds] = useState<NonNullable<AdsForUrlResponse["ads"]>>([]);
  const [pageAdsTotal, setPageAdsTotal] = useState(0);
  const [pageAdsLimit, setPageAdsLimit] = useState(30);
  const [adsExpanded, setAdsExpanded] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");

  const adsCacheKey = `${domainKey}:landing-pages-ads:${competitorId}:${encodeURIComponent(selectedUrl || "__none__")}:${stamp}:${pageAdsLimit}`;

  const { data: adsPayload, isValidating: adsValidating } = useScrapeKeyedCache<AdsForUrlResponse>({
    cacheKey: adsCacheKey,
    enabled: Boolean(competitorId && domainKey && selectedUrl && previewState !== "loading"),
    validateCached: (c) => c.ok === true && Array.isArray(c.ads),
    fetcher: async () => {
      const res = await fetch(
        `/api/landing-pages/ads-for-url?competitorId=${encodeURIComponent(competitorId)}&url=${encodeURIComponent(
          selectedUrl!
        )}&limit=${pageAdsLimit}`
      );
      return (await res.json()) as AdsForUrlResponse;
    },
  });

  const clearLoadTimer = useCallback(() => {
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
  }, []);


  useEffect(() => {
    if (rows.length !== 1) return;
    setSelectedUrl(rows[0]!.url);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.url.toLowerCase().includes(q) || r.host.toLowerCase().includes(q));
  }, [rows, query]);

  const selectedRow = useMemo(
    () => (selectedUrl ? rows.find((r) => r.url === selectedUrl) ?? null : null),
    [rows, selectedUrl],
  );

  useEffect(() => {
    if (!selectedUrl) {
      clearLoadTimer();
      setPreviewState("loading");
      return;
    }
    setPreviewState("loading");
    clearLoadTimer();
    loadTimerRef.current = setTimeout(() => {
      setPreviewState("blocked");
    }, 4000);
    return () => clearLoadTimer();
  }, [selectedUrl, previewDevice, clearLoadTimer]);

  const onIframeLoad = useCallback(() => {
    clearLoadTimer();
    setPreviewState((prev) => {
      if (prev === "blocked") return "blocked";
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc && doc.body && doc.body.children.length === 0) {
          return "blocked";
        }
        return "ok";
      } catch {
        return "ok";
      }
    });
  }, [clearLoadTimer]);

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
  }, [selectedUrl]);

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
    return (
      <div className="mx-auto w-full max-w-[1400px] px-6 py-6 sm:px-8 lg:px-10">
        <HeaderBar
          dataSince={null}
          lastScrapedAt={lastScrapedAt}
          onFreshnessRescrape={onFreshnessRescrape}
          title="Landing Pages"
          subtitle={competitorLabel}
        />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-6 sm:px-8 lg:px-10">
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
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-center px-6 py-24 text-center sm:px-8 lg:px-10">
        <Globe className="mb-4 h-12 w-12 text-slate-300" />
        <p className="max-w-md text-[14px] leading-relaxed text-slate-600">
          No landing pages detected yet. Try scraping more ads or wait for the next weekly update.
        </p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[1400px] px-6 py-6 sm:px-8 lg:px-10">
      <CacheRevalidatingDot show={Boolean((listValidating && listData) || (adsValidating && adsPayload))} />
      <HeaderBar
        dataSince={dataSince}
        lastScrapedAt={lastScrapedAt}
        onFreshnessRescrape={onFreshnessRescrape}
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
              filteredRows.map((row) => (
                <LandingPageListRow
                  key={row.groupId}
                  row={row}
                  selected={selectedUrl === row.url}
                  onSelect={() => setSelectedUrl(row.url)}
                />
              ))
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
                previewState={previewState}
                previewDevice={previewDevice}
                onPreviewDeviceChange={setPreviewDevice}
                iframeRef={iframeRef}
                onIframeLoad={onIframeLoad}
                onCopy={() => copyUrl(selectedUrl)}
              />

              {previewState !== "loading" && selectedRow ? (
                <AdsForPageSection
                  ads={pageAds}
                  total={pageAdsTotal}
                  expanded={adsExpanded}
                  onExpand={() => {
                    setAdsExpanded(true);
                    setPageAdsLimit(100);
                  }}
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
  lastScrapedAt,
  onFreshnessRescrape,
}: {
  title: string;
  subtitle: string;
  dataSince: string | null;
  lastScrapedAt: string | null;
  onFreshnessRescrape?: () => void;
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
        titleTrailing={<DataFreshnessBadge lastScrapedAt={lastScrapedAt} onRefresh={onFreshnessRescrape} />}
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
  const stripProto = row.url.replace(/^https?:\/\//, "");
  const display = stripProto.length > 52 ? `${stripProto.slice(0, 51)}…` : stripProto;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "flex h-14 w-full min-w-0 flex-col justify-center rounded-lg border border-transparent px-3 py-2 text-left transition-colors",
        selected
          ? "border-l-4 border-[color:var(--rival-primary)] bg-[color:var(--rival-accent-blue)]"
          : "hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-sm">
          {faviconFailed ? (
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
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-slate-900" title={row.url}>
          {display}
        </span>
        <span className="shrink-0 text-[13px] font-bold text-[color:var(--rival-primary)]">{row.count}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 pl-7">
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
      <p className="mt-0.5 pl-7 text-[10px] text-slate-500">{cap}</p>
    </button>
  );
}

function PreviewPane({
  url,
  row,
  previewState,
  previewDevice,
  onPreviewDeviceChange,
  iframeRef,
  onIframeLoad,
  onCopy,
}: {
  url: string;
  row: LandingPageRow | null;
  previewState: "loading" | "ok" | "blocked";
  previewDevice: "mobile" | "desktop";
  onPreviewDeviceChange: (mode: "mobile" | "desktop") => void;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  onIframeLoad: () => void;
  onCopy: () => void;
}) {
  const displayPath = url.replace(/^https?:\/\//, "");
  const displayUrlShort = displayPath.length > 42 ? `${displayPath.slice(0, 41)}…` : displayPath;

  const isMobile = previewDevice === "mobile";
  const desktopFitRef = useRef<HTMLDivElement | null>(null);
  const [desktopScale, setDesktopScale] = useState(1);

  useLayoutEffect(() => {
    if (isMobile || previewState === "blocked") return;

    const el = desktopFitRef.current;
    if (!el) return;

    const desktopChromeW = PREVIEW_DESKTOP.iframeW + PREVIEW_DESKTOP.border * 2;

    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (!Number.isFinite(w) || w <= 0) {
        requestAnimationFrame(() => {
          const w2 = el.getBoundingClientRect().width;
          if (Number.isFinite(w2) && w2 > 0) {
            setDesktopScale(Math.min(1, w2 / desktopChromeW));
          }
        });
        return;
      }
      setDesktopScale(Math.min(1, w / desktopChromeW));
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile, previewState, previewDevice, url]);

  if (previewState === "blocked") {
    return <BlockedPreviewCard url={url} displayPath={displayPath} row={row} onCopy={onCopy} />;
  }

  const iframeStyle = isMobile
    ? { width: PREVIEW_MOBILE.iframeW, height: PREVIEW_MOBILE.iframeH, maxWidth: "100%" as const }
    : { width: PREVIEW_DESKTOP.iframeW, height: PREVIEW_DESKTOP.iframeH };

  const desktopChromeW = PREVIEW_DESKTOP.iframeW + PREVIEW_DESKTOP.border * 2;
  const desktopChromeH = PREVIEW_DESKTOP.iframeH + PREVIEW_DESKTOP.border * 2;

  const viewportW = isMobile ? PREVIEW_MOBILE.outerW : desktopChromeW * desktopScale;
  const viewportH = isMobile ? PREVIEW_MOBILE.outerH : desktopChromeH * desktopScale;

  return (
    <div className="flex w-full max-w-[1220px] flex-col items-stretch">
      <div className="mb-4 flex w-full flex-wrap items-center gap-2">
        <div
          className="inline-flex shrink-0 rounded-[10px] border border-slate-200/90 bg-slate-100/95 p-0.5"
          role="group"
          aria-label="Preview device"
        >
          <button
            type="button"
            onClick={() => onPreviewDeviceChange("mobile")}
            className={[
              "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all",
              isMobile ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
            ].join(" ")}
          >
            Mobile
          </button>
          <button
            type="button"
            onClick={() => onPreviewDeviceChange("desktop")}
            className={[
              "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all",
              !isMobile ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
            ].join(" ")}
          >
            Desktop
          </button>
        </div>

        <div className="flex min-w-0 flex-1 basis-[200px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          <span className="truncate font-mono text-[11px] text-slate-700" title={url}>
            {displayUrlShort}
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

      <div ref={desktopFitRef} className="flex w-full min-w-0 justify-center">
        <div
          className={`relative overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.1)] ${PREVIEW_VIEWPORT_TRANSITION}`}
          style={{
            width: viewportW,
            height: viewportH,
            borderRadius: isMobile ? 24 : 16,
          }}
        >
          {previewState === "loading" ? (
            <div
              className={`absolute inset-0 z-10 flex flex-col items-center justify-center border border-slate-100 bg-slate-50/95 text-center ${PREVIEW_VIEWPORT_TRANSITION}`}
              style={{ borderRadius: isMobile ? 24 : 16 }}
            >
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <p className="mt-3 text-[13px] text-slate-600">Loading preview…</p>
            </div>
          ) : null}

          <div
            className={
              isMobile
                ? "relative flex h-full w-full items-center justify-center"
                : `absolute left-0 top-0 ${PREVIEW_DESKTOP_SCALE_TRANSITION}`
            }
            style={
              isMobile
                ? undefined
                : {
                    width: desktopChromeW,
                    height: desktopChromeH,
                    transform: `scale(${desktopScale})`,
                    transformOrigin: "top left",
                  }
            }
          >
            <div
              className={`flex flex-col items-center justify-center overflow-hidden border-[4px] border-[#1f2937] bg-[#e5e7eb] shadow-lg ${PREVIEW_VIEWPORT_TRANSITION}`}
              style={{
                width: isMobile ? PREVIEW_MOBILE.outerW : desktopChromeW,
                height: isMobile ? PREVIEW_MOBILE.outerH : desktopChromeH,
                borderRadius: isMobile ? 24 : 16,
              }}
            >
              <iframe
                ref={iframeRef}
                key={url}
                title="Landing page preview"
                src={url}
                className={`block border-0 bg-white ${PREVIEW_IFRAME_TRANSITION} ${
                  isMobile ? "rounded-[20px]" : "rounded-xl"
                } ${previewState === "loading" ? "opacity-0" : "opacity-100"}`}
                style={iframeStyle}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                referrerPolicy="no-referrer"
                loading="lazy"
                onLoad={onIframeLoad}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockedPreviewCard({
  url,
  displayPath,
  row,
  onCopy,
}: {
  url: string;
  displayPath: string;
  row: LandingPageRow | null;
  onCopy: () => void;
}) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const cap = row ? captionTopPlatforms(row.platformBreakdown, 3) : "";
  const usedLine = row ? `Used in ${row.count} ads${cap ? ` · ${cap}` : ""}` : null;

  return (
    <div
      className="flex w-[380px] max-w-full flex-col items-center rounded-xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm"
      style={{ width: 380 }}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
        {faviconFailed || !row?.faviconUrl ? (
          <Globe className="h-7 w-7 text-slate-400" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.faviconUrl}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            onError={() => setFaviconFailed(true)}
          />
        )}
      </div>
      <p className="mb-2 break-all font-mono text-[13px] font-semibold text-slate-900">{displayPath}</p>
      <p className="mb-6 text-[13px] leading-relaxed text-slate-600">
        This site doesn&apos;t allow preview embedding. Click below to open in a new tab.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--rival-primary)] px-4 py-3 text-[13px] font-semibold text-white hover:opacity-90"
      >
        Open in new tab
        <ExternalLink className="h-4 w-4" />
      </a>
      <button
        type="button"
        onClick={onCopy}
        className="mt-3 text-[11px] font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
      >
        Copy URL
      </button>
      {usedLine ? <p className="mt-4 text-[11px] text-slate-500">{usedLine}</p> : null}
      <p className="mt-3 text-[10px] text-slate-400">Preview limited by site&apos;s CSP headers</p>
    </div>
  );
}

function AdsForPageSection({
  ads,
  total,
  expanded,
  onExpand,
  onOpenAd,
}: {
  ads: NonNullable<AdsForUrlResponse["ads"]>;
  total: number;
  expanded: boolean;
  onExpand: () => void;
  onOpenAd: (id: string) => void;
}) {
  if (ads.length === 0) return null;

  const showCount = expanded ? ads.length : Math.min(20, ads.length);
  const visible = ads.slice(0, showCount);
  const showMoreControl = !expanded && total > 20;

  return (
    <div className="mt-8 w-full border-t border-slate-100 pt-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-slate-900">Ads using this page</h3>
        <span className="text-[12px] font-bold text-[color:var(--rival-primary)]">{total}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {visible.map((ad) => (
          <button
            key={ad.id}
            type="button"
            title={(ad.ad_text ?? "").slice(0, 60)}
            onClick={() => onOpenAd(ad.id)}
            className="group relative h-20 w-full overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200/80"
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: PLATFORM_BAR_COLORS[ad.platform] ?? "#e2e8f0" }}
            >
              <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-6 w-6 opacity-80" />
            </div>
            {ad.ad_creative_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote creative CDN URLs
              <img
                src={ad.ad_creative_url}
                alt=""
                className="relative z-[1] h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : null}
            <span className="absolute bottom-1 right-1 z-[2] flex h-6 w-6 items-center justify-center rounded-md bg-white/95 shadow">
              <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-4 w-4" />
            </span>
          </button>
        ))}
      </div>
      {showMoreControl ? (
        <button
          type="button"
          onClick={onExpand}
          className="mt-3 text-[12px] font-semibold text-sky-700 hover:underline"
        >
          Show all {total}
        </button>
      ) : null}
    </div>
  );
}
