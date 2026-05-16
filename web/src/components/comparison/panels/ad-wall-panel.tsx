"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Bookmark, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { isAdSaved, useSavedAdsStatus } from "@/lib/saved-ads/use-saved-ads";
import { cn } from "@/lib/utils";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";

type WallAdRow = {
  id: string;
  platform: string;
  format: string;
  ad_text: string;
  ad_creative_url: string | null;
  ai_extracted_angle: string | null;
  funnel_stage: string | null;
  first_seen_at: string;
  last_seen_at: string;
  lifespanDays: number;
};

type FunnelBuckets = { TOF: WallAdRow[]; MOF: WallAdRow[]; BOF: WallAdRow[] };
type StageKey = keyof FunnelBuckets;

type ApiOk = { ok: true; them: FunnelBuckets; you: FunnelBuckets };
type ApiErr = { ok: false; error?: string };
type Api = ApiOk | ApiErr;

type Props = {
  themCompetitorId: string;
  youCompetitorId: string;
  themBrandName: string;
  youBrandName: string;
  cacheDomainNorm: string;
  wsScrape: string;
  rivalScrape: string;
  sideBySideAvailable: boolean;
  onOpenAd: (adId: string) => void;
};

const STAGES: { key: StageKey; short: string; label: string }[] = [
  { key: "TOF", short: "Top", label: "Top of funnel" },
  { key: "MOF", short: "Middle", label: "Middle of funnel" },
  { key: "BOF", short: "Bottom", label: "Bottom of funnel" },
];

function isFbCdn(url: string) {
  return /fbcdn\.net|facebook\.com/i.test(url);
}

function MasonryAd({
  ad,
  hero,
  showSave,
  saved,
  onSave,
  onOpen,
  reduce,
}: {
  ad: WallAdRow;
  hero: boolean;
  showSave: boolean;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
  reduce: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const url = ad.ad_creative_url ?? "";
  const useNext = Boolean(url && isFbCdn(url) && !broken);

  return (
    <motion.div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-100 to-slate-200 shadow-sm ring-1 ring-black/[0.03]",
        hero ? "col-span-2 row-span-2 min-h-[168px]" : "col-span-1 row-span-1 min-h-[84px]"
      )}
      whileHover={reduce ? undefined : { scale: 1.03, zIndex: 5 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <button type="button" onClick={onOpen} className="relative block size-full min-h-[inherit] w-full text-left">
        {url && !broken ? (
          useNext ? (
            <span className="relative block size-full min-h-[inherit]">
              <Image
                src={url}
                alt=""
                fill
                sizes={hero ? "(max-width: 768px) 100vw, 220px" : "110px"}
                className="object-cover"
                onError={() => setBroken(true)}
                unoptimized
              />
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="size-full min-h-[inherit] object-cover"
              loading="lazy"
              decoding="async"
              onError={() => setBroken(true)}
            />
          )
        ) : (
          <div className="flex size-full min-h-[inherit] flex-col items-center justify-center gap-2 p-3">
            <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-8 w-8 text-slate-500" />
            <p className="line-clamp-4 text-center text-[10px] font-medium leading-snug text-slate-600">
              {ad.ad_text.slice(0, 120)}
            </p>
          </div>
        )}
      </button>
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200/80">
        <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-4 w-4" />
      </span>
      {showSave ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          className={cn(
            "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200/90 transition",
            saved ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          aria-label={saved ? "Saved" : "Save ad"}
        >
          <Bookmark className={cn("h-4 w-4", saved ? "fill-blue-600 text-blue-600" : "text-slate-700")} />
        </button>
      ) : null}
    </motion.div>
  );
}

export function AdWallPanel({
  themCompetitorId,
  youCompetitorId,
  themBrandName,
  youBrandName,
  cacheDomainNorm,
  wsScrape,
  rivalScrape,
  sideBySideAvailable,
  onOpenAd,
}: Props) {
  const rm = useReducedMotion() ?? false;
  const cacheKey = `${cacheDomainNorm.trim().toLowerCase()}:comparison-ad-wall:${themCompetitorId}:${
    youCompetitorId
  }:${wsScrape}:${rivalScrape}`;

  const { data, loading, error } = useScrapeKeyedCache<Api>({
    cacheKey,
    enabled: Boolean(themCompetitorId.trim() && youCompetitorId.trim()),
    validateCached: (c) => c.ok === true && Boolean(c.them && c.you),
    fetcher: async () => {
      const res = await fetch(
        `/api/comparison/vault-ads?bothBrands=1&themCompetitorId=${encodeURIComponent(
          themCompetitorId
        )}&youCompetitorId=${encodeURIComponent(youCompetitorId)}`,
        { credentials: "include" }
      );
      const json = (await res.json()) as Api;
      if (!res.ok || !json.ok) {
        throw new Error((json as ApiErr).error ?? "Ad wall load failed");
      }
      return json;
    },
  });

  const them = data?.ok ? data.them : null;
  const you = data?.ok ? data.you : null;

  const defaultStage = useMemo((): StageKey => {
    if (!them || !you) return "TOF";
    let best: StageKey = "TOF";
    let bestSum = -1;
    for (const s of STAGES) {
      const sum = them[s.key].length + you[s.key].length;
      if (sum > bestSum) {
        bestSum = sum;
        best = s.key;
      }
    }
    return best;
  }, [them, you]);

  const [stage, setStage] = useState<StageKey>("TOF");
  const stageInitRef = useRef(false);

  useEffect(() => {
    stageInitRef.current = false;
  }, [cacheKey]);

  useEffect(() => {
    if (!them || !you || stageInitRef.current) return;
    stageInitRef.current = true;
    setStage(defaultStage);
  }, [them, you, defaultStage, cacheKey]);

  const [drawer, setDrawer] = useState<{ side: "them" | "you"; list: WallAdRow[] } | null>(null);

  const themList = them?.[stage] ?? [];
  const youList = you?.[stage] ?? [];

  const themIds = useMemo(() => themList.map((a) => a.id), [themList]);

  const { savedMap, saveAd } = useSavedAdsStatus(themCompetitorId, [], themIds, cacheDomainNorm);

  if (loading && !them) {
    return (
      <div
        id="comparison-ad-wall"
        className="relative mb-12 scroll-mt-36 pt-8 pb-2"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ad wall</p>
        <RivalLoadingBlock padded className="mt-4 py-10" />
      </div>
    );
  }

  if (error?.message) {
    return (
      <div id="comparison-ad-wall" className="relative mb-12 scroll-mt-36 pt-1">
        <p className="text-sm text-red-700">{error.message}</p>
      </div>
    );
  }

  return (
    <div
      id="comparison-ad-wall"
      className="relative mb-12 scroll-mt-36 pt-8 pb-2"
    >
      <div
        className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
        aria-hidden
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ad wall</p>
      <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Funnel-stage creative lane</h3>
      <p className="mt-1 text-sm text-slate-500">Hero tile highlights the newest hero in each lane; hover to save theirs.</p>

      {!sideBySideAvailable ? (
        <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-950">
          Connect your brand to unlock side-by-side lanes.
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
        {STAGES.map((s) => {
          const tc = them?.[s.key].length ?? 0;
          const yc = you?.[s.key].length ?? 0;
          const active = stage === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStage(s.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
                active ? "bg-[var(--rival-primary,#343434)] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {s.short}
              <span className="tabular-nums opacity-80">
                ({tc}/{yc})
              </span>
              {sideBySideAvailable && yc === 0 ? <span className="text-amber-200">·</span> : null}
            </button>
          );
        })}
      </div>

      <div className={cn("mt-6 grid gap-8", sideBySideAvailable ? "lg:grid-cols-2" : "")}>
        <WallColumn
          title={`Them · ${themBrandName}`}
          list={themList}
          showSave
          savedMap={savedMap}
          onSave={(id) => void saveAd({ scrapedAdId: id })}
          onOpen={onOpenAd}
          onShowAll={() => setDrawer({ side: "them", list: themList })}
          reduce={rm}
        />
        {sideBySideAvailable ? (
          <WallColumn
            title={`You · ${youBrandName}`}
            list={youList}
            showSave={false}
            savedMap={{}}
            onSave={() => {}}
            onOpen={onOpenAd}
            onShowAll={() => setDrawer({ side: "you", list: youList })}
            reduce={rm}
          />
        ) : null}
      </div>

      {drawer ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="presentation" onClick={() => setDrawer(null)}>
          <div
            role="dialog"
            className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">
                {drawer.side === "them" ? themBrandName : youBrandName} · all in this stage
              </p>
              <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-slate-100" onClick={() => setDrawer(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 overflow-y-auto p-4">
              {drawer.list.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onOpenAd(a.id);
                    setDrawer(null);
                  }}
                  className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                >
                  {a.ad_creative_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.ad_creative_url} alt="" className="size-full  object-cover" loading="lazy" />
                  ) : (
                    <span className="p-2 text-[9px] text-slate-600">{a.ad_text.slice(0, 60)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WallColumn({
  title,
  list,
  showSave,
  savedMap,
  onSave,
  onOpen,
  onShowAll,
  reduce,
}: {
  title: string;
  list: WallAdRow[];
  showSave: boolean;
  savedMap: Record<string, string>;
  onSave: (id: string) => void;
  onOpen: (id: string) => void;
  onShowAll: () => void;
  reduce: boolean;
}) {
  const preview = list.slice(0, 8);
  const hasMore = list.length > preview.length;

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
        <p className="font-semibold text-slate-700">{title}</p>
        <p className="mt-2">No ads in this stage yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{title}</p>
      <div className="grid grid-cols-4 gap-2 auto-rows-[84px]">
        {preview.map((ad, i) => (
          <MasonryAd
            key={ad.id}
            ad={ad}
            hero={i === 0}
            showSave={showSave}
            saved={Boolean(savedMap[ad.id])}
            onSave={() => onSave(ad.id)}
            onOpen={() => onOpen(ad.id)}
            reduce={reduce}
          />
        ))}
      </div>
      {hasMore ? (
        <button type="button" onClick={onShowAll} className="text-sm font-semibold text-slate-700 underline-offset-4 hover:underline">
          Show all {list.length} →
        </button>
      ) : null}
    </div>
  );
}
