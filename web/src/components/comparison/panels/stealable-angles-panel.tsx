"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bookmark, ChevronDown, Eye, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { listStealableAngleRows } from "@/lib/comparison/angle-compare";
import {
  angleCategoryPill,
  filterBrandAwarenessStealableRows,
  lifespanDotClass,
  parseAngleForDisplay,
} from "@/lib/comparison/stealable-angle-present";
import type { CompetitorStrategyOverviewPayload, StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { readCache, writeCache } from "@/lib/cache/use-scrape-keyed-cache";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { isAdSaved, useSavedAdsStatus } from "@/lib/saved-ads/use-saved-ads";
import { RivalLoadingMicro } from "@/components/ui/rival-loading";

type VaultExampleAd = {
  id: string;
  platform: string;
  ad_text: string;
  ad_creative_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  lifespanDays: number;
};

type Props = {
  workspacePayload: CompetitorStrategyOverviewPayload | null;
  competitorPayload: CompetitorStrategyOverviewPayload | null;
  competitorId: string;
  competitorBrandName: string;
  competitorDomain: string;
  workspaceBrandName: string;
  cacheDomainNorm: string;
  competitorScrapeStamp: string;
  onOpenAd: (adId: string) => void;
};

function AdThumb96({
  ad,
  loading,
  onOpen,
}: {
  ad: VaultExampleAd | null | undefined;
  loading: boolean;
  onOpen: () => void;
}) {
  const [broken, setBroken] = useState(false);

  if (loading) {
    return (
      <div className="flex size-24 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100">
        <RivalLoadingMicro />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => ad?.id && onOpen()}
      className="relative size-24 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {ad?.ad_creative_url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.ad_creative_url}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center">
          <ComparisonPlatformIcon platform={(ad?.platform ?? "meta") as StrategyPlatform} className="h-8 w-8 opacity-60" />
          <span className="line-clamp-3 text-[9px] font-medium text-slate-600">{(ad?.ad_text ?? "").slice(0, 48)}</span>
        </div>
      )}
      {ad?.platform ? (
        <span className="absolute bottom-1 right-1 rounded-full bg-white/95 p-0.5 shadow-sm ring-1 ring-slate-200/80">
          <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-4 w-4" />
        </span>
      ) : null}
    </button>
  );
}

export function StealableAnglesPanel({
  workspacePayload,
  competitorPayload,
  competitorId,
  competitorBrandName,
  competitorDomain,
  workspaceBrandName,
  cacheDomainNorm,
  competitorScrapeStamp,
  onOpenAd,
}: Props) {
  const rm = useReducedMotion() ?? false;

  const fullStealable = useMemo(() => {
    const raw = listStealableAngleRows(workspacePayload, competitorPayload);
    return filterBrandAwarenessStealableRows(raw, competitorBrandName, competitorDomain);
  }, [workspacePayload, competitorPayload, competitorBrandName, competitorDomain]);

  const stealable = useMemo(() => fullStealable.slice(0, 5), [fullStealable]);
  const [showAll, setShowAll] = useState(false);
  const visibleRows = showAll ? fullStealable.slice(0, 10) : stealable;
  const remainder = Math.max(0, fullStealable.length - visibleRows.length);

  const [examples, setExamples] = useState<Record<string, VaultExampleAd | null>>({});
  const [loadingAngles, setLoadingAngles] = useState<Record<string, boolean>>({});

  const [drawerAngle, setDrawerAngle] = useState<string | null>(null);
  const [drawerAds, setDrawerAds] = useState<VaultExampleAd[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const exampleIds = useMemo(() => Object.values(examples).flatMap((x) => (x?.id ? [x.id] : [])), [examples]);

  const { savedMap, saveAd } = useSavedAdsStatus(competitorId, [], exampleIds, cacheDomainNorm);

  const storageKeyForAngle = useCallback(
    (angle: string) =>
      `${cacheDomainNorm.trim().toLowerCase()}:vault-angle-example:${competitorId.trim()}:${competitorScrapeStamp}:${encodeURIComponent(angle)}`,
    [cacheDomainNorm, competitorId, competitorScrapeStamp]
  );

  useEffect(() => {
    const cid = competitorId.trim();
    if (!cid || visibleRows.length === 0) return;

    let cancelled = false;

    void (async () => {
      for (const row of visibleRows) {
        if (cancelled) return;
        const angle = row.angle;
        const sk = storageKeyForAngle(angle);
        const hit = readCache<{ ok?: boolean; ads?: VaultExampleAd[] }>(sk, false);
        if (hit?.ok && hit.ads?.length) {
          setExamples((e) => ({ ...e, [angle]: hit.ads![0] ?? null }));
          continue;
        }

        setLoadingAngles((m) => ({ ...m, [angle]: true }));
        try {
          const res = await fetch(
            `/api/comparison/vault-ads?competitorId=${encodeURIComponent(cid)}&angle=${encodeURIComponent(angle)}`,
            { credentials: "include" }
          );
          const json = (await res.json()) as { ok?: boolean; ads?: VaultExampleAd[] };
          if (json.ok) {
            writeCache(sk, json, false);
          }
          if (json.ok && json.ads?.length) {
            setExamples((e) => ({ ...e, [angle]: json.ads![0] ?? null }));
          } else {
            setExamples((e) => ({ ...e, [angle]: null }));
          }
        } catch {
          setExamples((e) => ({ ...e, [angle]: null }));
        } finally {
          setLoadingAngles((m) => ({ ...m, [angle]: false }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [competitorId, visibleRows, storageKeyForAngle]);

  const openDrawer = useCallback(
    async (angle: string) => {
      setDrawerAngle(angle);
      setDrawerLoading(true);
      setDrawerAds([]);
      const cid = competitorId.trim();
      try {
        const res = await fetch(
          `/api/comparison/vault-ads?competitorId=${encodeURIComponent(cid)}&angle=${encodeURIComponent(angle)}`,
          { credentials: "include" }
        );
        const json = (await res.json()) as { ok?: boolean; ads?: VaultExampleAd[] };
        setDrawerAds(json.ads ?? []);
      } finally {
        setDrawerLoading(false);
      }
    },
    [competitorId]
  );

  if (fullStealable.length === 0) {
    return (
      <div
        id="comparison-stealable"
        className="relative mb-12 scroll-mt-36 pt-8 pb-2"
      >
        <div
          className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
          aria-hidden
        />
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Stealable angles</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              Creative lanes {competitorBrandName} runs that you do not
            </h3>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          {competitorPayload?.insights.angles_by_platform?.length
            ? `Your angle coverage matches ${competitorBrandName} across the creative patterns we measure after filtering brand-navigation placements. Strong baseline.`
            : "Few angles detected yet — give the scraper another cycle."}
        </p>
      </div>
    );
  }

  return (
    <div
      id="comparison-stealable"
      className="relative mb-12 scroll-mt-36 pt-8 pb-2"
    >
      <div
        className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
        aria-hidden
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Stealable angles</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            {fullStealable.length} angles {competitorBrandName} uses that {workspaceBrandName} doesn&apos;t
          </h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Filtered
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {visibleRows.map((row, idx) => {
          const ex = examples[row.angle];
          const busy = loadingAngles[row.angle];
          const { hook, blurb } = parseAngleForDisplay(row.angle);
          const pill = angleCategoryPill(row.angle);
          const dot = lifespanDotClass(row.avgLifespanDays ?? null);
          const plat = row.platforms?.[0] ?? "meta";
          const saved = ex?.id ? isAdSaved(savedMap, ex.id) : false;

          return (
            <motion.div
              key={row.angle}
              data-stealable-angle={row.angle}
              initial={rm ? false : { opacity: 0, y: 10 }}
              whileInView={rm ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <AdThumb96 ad={ex} loading={busy} onOpen={() => ex?.id && onOpenAd(ex.id)} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pill.className}`}
                    >
                      {pill.label}
                    </span>
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
                      <ComparisonPlatformIcon platform={plat as StrategyPlatform} className="h-3.5 w-3.5" />
                      <span className="capitalize">{plat}</span>
                      <span className="text-slate-300">·</span>
                      <span>{row.totalCount ?? 0} ads</span>
                      <span className="text-slate-300">·</span>
                      <span className={`inline-block size-2 rounded-full ${dot}`} title="Avg lifespan signal" />
                      <span className="tabular-nums">{row.avgLifespanDays ?? "—"}d avg</span>
                    </span>
                  </div>
                  <p className="text-base font-semibold leading-snug text-slate-900">&ldquo;{hook}&rdquo;</p>
                  <p className="line-clamp-2 text-sm text-slate-600">{blurb}</p>
                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!ex?.id || saved}
                      onClick={() => void saveAd({ scrapedAdId: ex?.id })}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      {saved ? "Saved" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void openDrawer(row.angle)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      See all {row.totalCount ?? 0}
                      <ChevronDown className="h-3 w-3 -rotate-90" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {remainder > 0 && !showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-4 text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
        >
          + {remainder} more angle gaps · Show all
        </button>
      ) : null}

      {drawerAngle ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
          role="presentation"
          onClick={() => setDrawerAngle(null)}
        >
          <div
            role="dialog"
            aria-modal
            className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">All ads · angle</p>
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{drawerAngle}</p>
              </div>
              <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-slate-100" onClick={() => setDrawerAngle(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {drawerLoading ? (
                <div className="flex justify-center py-8">
                  <RivalLoadingMicro />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {drawerAds.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onOpenAd(a.id)}
                      className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 shadow-sm"
                    >
                      {a.ad_creative_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.ad_creative_url} alt="" className="size-full object-cover" loading="lazy" />
                      ) : (
                        <span className="p-2 text-[10px] text-slate-600">{a.ad_text.slice(0, 80)}</span>
                      )}
                      <span className="absolute bottom-1 right-1 rounded-full bg-white/90 p-0.5 shadow-sm">
                        <ComparisonPlatformIcon platform={a.platform as StrategyPlatform} className="h-3 w-3" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
