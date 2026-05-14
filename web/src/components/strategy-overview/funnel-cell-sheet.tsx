"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { useAdDetailState } from "@/lib/ad-detail/use-ad-detail-state";
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
  library_item_id: string | null;
  raw_payload_subset: {
    landing_page_url?: string;
    video_url?: string;
    headline?: string;
    cta_type?: string;
  };
};

type Props = {
  open: boolean;
  cellId: FunnelCellId | null;
  competitorId: string;
  /** Normalized brand domain for saved-ads list cache invalidation. */
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
    cacheDomainNorm,
  );

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
      <div className="relative h-full w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <ComparisonPlatformIcon platform={parsed.platform} className="h-7 w-7 shrink-0" />
              <h2 id="funnel-cell-sheet-title" className="text-[15px] font-semibold text-[#0f172a] truncate">
                {headerLabel}
              </h2>
              <span
                className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${STAGE_PILL[parsed.stage]}`}
              >
                {parsed.stage}
              </span>
            </div>
            {summary != null ? (
              <p className="text-[12px] text-slate-600 mt-1.5">
                {summary.adCount} ads{spendLine ? ` · ${spendLine}` : null}
              </p>
            ) : null}
            {summary?.cellConfidence === "high" ? (
              <p className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                High confidence
              </p>
            ) : summary?.cellConfidence === "low" ? (
              <p className="text-[10px] text-amber-800 mt-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Limited data
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {err ? <p className="text-[13px] text-red-600">{err}</p> : null}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-100 overflow-hidden animate-pulse">
                  <div className="h-28 bg-slate-100" />
                  <div className="p-2 space-y-2">
                    <div className="h-3 bg-slate-100 rounded" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ads.map((a) => (
                <article
                  key={a.id}
                  className="rounded-xl border border-slate-100 overflow-hidden flex flex-col bg-white/90"
                >
                  <CreativeThumb url={a.ad_creative_url} format={a.format} platform={parsed.platform} />
                  <div className="p-2 flex flex-col flex-1 gap-2">
                    <p className="text-[11px] text-slate-700 leading-snug line-clamp-4">
                      {(a.ad_text ?? "").trim().slice(0, 80)}
                      {(a.ad_text ?? "").length > 80 ? "…" : ""}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleSave(a)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold border transition-colors ${
                          isAdSaved(savedMap, a.id)
                            ? "border-[color:var(--rival-accent-blue)] bg-[#DDF1FD]/90 text-[#111827]"
                            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        {isAdSaved(savedMap, a.id) ? "Saved" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openAd(a.id)}
                        className="rounded-lg px-2.5 py-1 text-[10px] font-semibold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      >
                        Open ad
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {!loading && totalInCell > ads.length ? (
          <div className="p-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-600 mb-2">
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

function CreativeThumb({
  url,
  format,
  platform,
}: {
  url: string | null;
  format: string;
  platform: StrategyPlatform;
}) {
  const [broken, setBroken] = useState(false);
  const isVideo =
    Boolean(url && /\.(mp4|webm)(\?|$)/i.test(url)) || (format || "").toLowerCase().includes("video");

  if (!url || broken) {
    return (
      <div
        className={`h-28 w-full flex items-center justify-center text-[10px] text-slate-500 ${
          platform === "meta"
            ? "bg-blue-50"
            : platform === "google"
              ? "bg-red-50/80"
              : platform === "tiktok"
                ? "bg-cyan-50/80"
                : "bg-slate-50"
        }`}
      >
        No preview
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="h-28 w-full bg-slate-900">
        <video src={url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
      </div>
    );
  }

  return (
    <div className="h-28 w-full bg-slate-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
    </div>
  );
}
