"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Play, X } from "lucide-react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { useAdDetailState } from "@/lib/ad-detail/use-ad-detail-state";
import {
  resolveCellAdLifecycle,
  sortCellAds,
  type CellAdLifecycle,
  type CellAdSortMode,
} from "@/lib/strategy-overview/cell-ad-lifecycle";
import type {
  FunnelCellId,
  FunnelCellNodePayload,
  FunnelStage,
  StrategyPlatform,
} from "@/lib/strategy-overview/payload-types";
import { isAdSaved, useSavedAdsStatus } from "@/lib/saved-ads/use-saved-ads";

const STAGE_PILL: Record<FunnelStage, string> = {
  TOF: "bg-blue-100 text-blue-700 border border-blue-200",
  MOF: "bg-amber-100 text-amber-700 border border-amber-200",
  BOF: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

const SORT_OPTIONS: { id: CellAdSortMode; label: string }[] = [
  { id: "active_first", label: "Active first" },
  { id: "longest_running", label: "Longest running" },
  { id: "shortest_running", label: "Shortest run" },
  { id: "recently_ended", label: "Recently ended" },
];

function formatSpendShort(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function parseCellId(id: FunnelCellId): { platform: StrategyPlatform; stage: FunnelStage } | null {
  const i = id.indexOf(":");
  if (i <= 0) return null;
  const platform = id.slice(0, i) as StrategyPlatform;
  const stage = id.slice(i + 1) as FunnelStage;
  const stages: FunnelStage[] = ["TOF", "MOF", "BOF"];
  const platforms: StrategyPlatform[] = ["meta", "google", "linkedin", "tiktok", "pinterest", "snapchat"];
  if (!platforms.includes(platform) || !stages.includes(stage)) return null;
  return { platform, stage };
}

type CellAdRow = {
  id: string;
  platform: string;
  format: string;
  ad_text: string;
  ad_creative_url: string | null;
  ai_extracted_angle: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  is_running?: boolean;
  runtime_days?: number;
  ended_days_ago?: number | null;
  status_label?: string;
  sort_runtime_ms?: number;
  library_item_id: string | null;
  raw_payload_subset: {
    landing_page_url?: string;
    video_url?: string;
    poster_url?: string;
    headline?: string;
    cta_type?: string;
  };
};

type Props = {
  open: boolean;
  cellId: FunnelCellId | null;
  competitorId: string;
  cacheDomainNorm: string;
  onClose: () => void;
  cellSummary: FunnelCellNodePayload | null;
};

export function FunnelCellSheet({ open, cellId, competitorId, cacheDomainNorm, onClose, cellSummary }: Props) {
  const { openAd } = useAdDetailState();
  const parsed = useMemo(() => (cellId ? parseCellId(cellId) : null), [cellId]);

  const [ads, setAds] = useState<CellAdRow[]>([]);
  const [totalInCell, setTotalInCell] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<CellAdSortMode>("active_first");

  const libraryItems = useMemo(
    () =>
      ads.flatMap((a) =>
        a.library_item_id ? [{ platform: a.platform, libraryItemId: a.library_item_id }] : []
      ),
    [ads]
  );
  const scrapedAdIds = useMemo(() => ads.map((a) => a.id), [ads]);

  const { savedMap, toggleSave, saveAd, unsaveAd } = useSavedAdsStatus(
    competitorId,
    libraryItems,
    scrapedAdIds,
    cacheDomainNorm
  );

  const adsWithLifecycle = useMemo(
    () =>
      ads.map((ad) => ({
        ad,
        lifecycle:
          ad.status_label != null
            ? ({
                isRunning: ad.is_running ?? false,
                runtimeDays: ad.runtime_days ?? 0,
                endedDaysAgo: ad.ended_days_ago ?? null,
                statusLabel: ad.status_label,
                sortRuntimeMs: ad.sort_runtime_ms ?? (ad.runtime_days ?? 0) * 86_400_000,
              } satisfies CellAdLifecycle)
            : resolveCellAdLifecycle({
                platform: ad.platform,
                first_seen_at: ad.first_seen_at,
                last_seen_at: ad.last_seen_at,
                is_active: ad.is_active,
              }),
      })),
    [ads]
  );

  const sortedAds = useMemo(() => sortCellAds(adsWithLifecycle, sortMode), [adsWithLifecycle, sortMode]);

  const runningCount = useMemo(
    () => adsWithLifecycle.filter((x) => x.lifecycle.isRunning).length,
    [adsWithLifecycle]
  );
  const inactiveCount = adsWithLifecycle.length - runningCount;

  const resetAndFetch = useCallback(async () => {
    if (!parsed) return;
    if (!competitorId.trim()) {
      setLoading(false);
      setErr("Open this competitor from your dashboard so we can load saved ads for this drawer.");
      setAds([]);
      setTotalInCell(0);
      setNextCursor(null);
      return;
    }
    setLoading(true);
    setErr(null);
    setAds([]);
    setNextCursor(null);
    try {
      const q = new URLSearchParams({
        competitorId: competitorId.trim(),
        platform: parsed.platform,
        stage: parsed.stage,
        limit: "50",
      });
      const res = await fetch(`/api/strategy-overview/cell-ads?${q}`, { credentials: "include" });
      const json = (await res.json()) as {
        ok?: boolean;
        ads?: CellAdRow[];
        total_in_cell?: number;
        next_cursor?: string | null;
        error?: string;
      };
      if (!json.ok) {
        setErr(json.error ?? "Failed to load");
        return;
      }
      setAds(json.ads ?? []);
      setTotalInCell(json.total_in_cell ?? 0);
      setNextCursor(json.next_cursor ?? null);
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }, [parsed, competitorId]);

  useEffect(() => {
    if (!open || !parsed) return;
    void resetAndFetch();
  }, [open, parsed, resetAndFetch]);

  const loadMore = useCallback(async () => {
    if (!parsed || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = new URLSearchParams({
        competitorId: competitorId.trim(),
        platform: parsed.platform,
        stage: parsed.stage,
        limit: "50",
        cursor: nextCursor,
      });
      const res = await fetch(`/api/strategy-overview/cell-ads?${q}`, { credentials: "include" });
      const json = (await res.json()) as {
        ok?: boolean;
        ads?: CellAdRow[];
        next_cursor?: string | null;
      };
      if (json.ok && json.ads?.length) {
        setAds((prev) => [...prev, ...json.ads!]);
        setNextCursor(json.next_cursor ?? null);
      } else {
        setNextCursor(null);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [parsed, competitorId, nextCursor, loadingMore]);

  const handleSave = useCallback(
    async (ad: CellAdRow) => {
      if (isAdSaved(savedMap, ad.id)) {
        await unsaveAd(ad.id);
        return;
      }
      if (ad.library_item_id) {
        await toggleSave(ad.platform, ad.library_item_id);
      } else {
        await saveAd({ scrapedAdId: ad.id });
      }
    },
    [savedMap, unsaveAd, toggleSave, saveAd]
  );

  if (!open || !cellId || !parsed) return null;

  const summary = cellSummary;
  const headerLabel = summary?.label ?? parsed.platform;
  const spendLine =
    summary != null
      ? `Modeled €${formatSpendShort(summary.estSpendEurLow)}–€${formatSpendShort(summary.estSpendEurHigh)}/mo`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal aria-labelledby="funnel-cell-sheet-title">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-[#f8fafc] shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="border-b border-slate-200 bg-white px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <ComparisonPlatformIcon platform={parsed.platform} className="h-7 w-7 shrink-0" />
                <h2 id="funnel-cell-sheet-title" className="truncate text-[16px] font-semibold text-[#0f172a]">
                  {headerLabel}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${STAGE_PILL[parsed.stage]}`}
                >
                  {parsed.stage}
                </span>
              </div>
              {summary != null ? (
                <p className="mt-1.5 text-[12px] text-slate-600">
                  {summary.adCount} ads{spendLine ? ` · ${spendLine}` : null}
                </p>
              ) : null}
              {!loading && ads.length > 0 ? (
                <p className="mt-1 text-[11px] text-slate-500">
                  <span className="font-medium text-emerald-700">{runningCount} active</span>
                  {" · "}
                  <span className="font-medium text-slate-600">{inactiveCount} inactive</span>
                </p>
              ) : null}
              {summary?.cellConfidence === "high" ? (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  High confidence
                </p>
              ) : summary?.cellConfidence === "low" ? (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Limited data
                </p>
              ) : null}
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-50">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!loading && ads.length > 0 ? (
            <div className="mt-3 flex items-center gap-2">
              <ArrowDownUp className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              <label htmlFor="funnel-cell-sort" className="sr-only">
                Sort ads
              </label>
              <select
                id="funnel-cell-sort"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as CellAdSortMode)}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {err ? <p className="text-[13px] text-red-600">{err}</p> : null}
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white animate-pulse">
                  <div className="aspect-[4/5] bg-slate-100" />
                  <div className="space-y-2 p-3">
                    <div className="h-3 rounded bg-slate-100" />
                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {sortedAds.map(({ ad: a, lifecycle }) => (
                <CellAdCard
                  key={a.id}
                  ad={a}
                  lifecycle={lifecycle}
                  platform={parsed.platform}
                  saved={isAdSaved(savedMap, a.id)}
                  onSave={() => void handleSave(a)}
                  onOpen={() => openAd(a.id)}
                />
              ))}
            </div>
          )}
        </div>

        {!loading && totalInCell > ads.length ? (
          <div className="border-t border-slate-200 bg-white p-4 text-center">
            <p className="mb-2 text-[11px] text-slate-600">
              Showing first {ads.length} of {totalInCell} ads in this cell.
            </p>
            {nextCursor ? (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadMore()}
                className="text-[12px] font-medium text-sky-700 hover:underline"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CellAdCard({
  ad,
  lifecycle,
  platform,
  saved,
  onSave,
  onOpen,
}: {
  ad: CellAdRow;
  lifecycle: CellAdLifecycle;
  platform: StrategyPlatform;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  const headline = ad.raw_payload_subset?.headline?.trim();
  const previewText = headline || (ad.ad_text ?? "").trim();
  const formatLabel = (ad.format || "ad").toLowerCase().includes("video") ? "Video" : "Image";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="relative overflow-hidden border-b border-slate-100 bg-[#eef2f7] p-1.5">
        <div className="overflow-hidden rounded-xl bg-white shadow-inner ring-1 ring-slate-200/80">
          <CreativeThumb
            creativeUrl={ad.ad_creative_url}
            videoUrl={ad.raw_payload_subset?.video_url}
            posterUrl={ad.raw_payload_subset?.poster_url}
            format={ad.format}
            platform={platform}
          />
        </div>
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-sm ${
            lifecycle.isRunning
              ? "bg-emerald-500/95 text-white"
              : "bg-slate-700/90 text-white"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${lifecycle.isRunning ? "bg-white" : "bg-slate-300"}`}
          />
          {lifecycle.isRunning ? "Active" : "Inactive"}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {formatLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <div>
          <p className="text-[10px] font-medium leading-snug text-slate-500">{lifecycle.statusLabel}</p>
          <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-slate-800">{previewText || "—"}</p>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onSave}
            className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-colors ${
              saved
                ? "border-[color:var(--rival-accent-blue)] bg-[#DDF1FD]/90 text-[#111827]"
                : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-800 hover:bg-slate-50"
          >
            Open ad
          </button>
        </div>
      </div>
    </article>
  );
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|m3u8)(\?|$)/i.test(url);
}

function CreativeThumb({
  creativeUrl,
  videoUrl,
  posterUrl,
  format,
  platform,
}: {
  creativeUrl: string | null;
  videoUrl?: string | null;
  posterUrl?: string | null;
  format: string;
  platform: StrategyPlatform;
}) {
  const [broken, setBroken] = useState(false);
  const [playing, setPlaying] = useState(false);

  const stream =
    (videoUrl?.trim() || "").length > 0
      ? videoUrl!.trim()
      : creativeUrl && isDirectVideoUrl(creativeUrl)
        ? creativeUrl.trim()
        : "";

  const poster = (
    posterUrl?.trim() ||
    (creativeUrl && !isDirectVideoUrl(creativeUrl) ? creativeUrl.trim() : "") ||
    ""
  ).trim();

  const isVideo =
    Boolean(stream) &&
    ((format || "").toLowerCase().includes("video") || isDirectVideoUrl(stream));

  useEffect(() => {
    setBroken(false);
    setPlaying(false);
  }, [creativeUrl, videoUrl, posterUrl, format]);

  const emptyClass = `flex aspect-[4/5] w-full items-center justify-center text-[10px] text-slate-500 ${
    platform === "meta"
      ? "bg-blue-50"
      : platform === "google"
        ? "bg-red-50/80"
        : platform === "tiktok"
          ? "bg-cyan-50/80"
          : "bg-slate-50"
  }`;

  if (isVideo && playing && stream) {
    return (
      <div className="aspect-[4/5] w-full bg-slate-900">
        <video
          src={stream}
          className="h-full w-full object-cover"
          controls
          autoPlay
          playsInline
          preload="metadata"
          poster={poster || undefined}
          {...{ referrerPolicy: "no-referrer" as React.HTMLAttributeReferrerPolicy }}
          onError={() => setPlaying(false)}
        />
      </div>
    );
  }

  if (isVideo && poster && !broken) {
    return (
      <button
        type="button"
        className="relative block aspect-[4/5] w-full overflow-hidden border-0 bg-slate-900 p-0"
        onClick={() => setPlaying(true)}
        aria-label="Play video ad"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/35 via-transparent to-black/10">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-lg">
            <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden />
          </span>
        </span>
      </button>
    );
  }

  if (isVideo && stream) {
    return (
      <div className="aspect-[4/5] w-full bg-slate-900">
        <video
          src={stream}
          className="h-full w-full object-cover"
          controls
          playsInline
          preload="metadata"
          {...{ referrerPolicy: "no-referrer" as React.HTMLAttributeReferrerPolicy }}
        />
      </div>
    );
  }

  if (poster && !broken) {
    return (
      <div className="aspect-[4/5] w-full bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      </div>
    );
  }

  return <div className={emptyClass}>No preview</div>;
}
