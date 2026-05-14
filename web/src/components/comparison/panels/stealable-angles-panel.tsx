"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bookmark, X } from "lucide-react";

import { listStealableAngleRows } from "@/lib/comparison/angle-compare";
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
  workspaceBrandName: string;
  cacheDomainNorm: string;
  competitorScrapeStamp: string;
  onOpenAd: (adId: string) => void;
};

function trunc(s: string, n: number): string {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

export function StealableAnglesPanel({
  workspacePayload,
  competitorPayload,
  competitorId,
  competitorBrandName,
  workspaceBrandName,
  cacheDomainNorm,
  competitorScrapeStamp,
  onOpenAd,
}: Props) {
  const fullStealable = useMemo(
    () => listStealableAngleRows(workspacePayload, competitorPayload),
    [workspacePayload, competitorPayload]
  );
  const stealable = useMemo(() => fullStealable.slice(0, 10), [fullStealable]);
  const remainder = Math.max(0, fullStealable.length - stealable.length);

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
    if (!cid || stealable.length === 0) return;

    let cancelled = false;

    void (async () => {
      for (const row of stealable) {
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
  }, [competitorId, stealable, storageKeyForAngle]);

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

  if (stealable.length === 0) {
    return (
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold uppercase tracking-wider text-slate-700">Stealable angles</h3>
        <p className="mt-1 text-sm text-slate-500">
          Angles {competitorBrandName} uses that {workspaceBrandName} doesn&apos;t
        </p>
        <p className="mt-4 text-sm text-slate-500">
          {competitorPayload?.insights.angles_by_platform?.length
            ? "No angle gaps detected. Your angle coverage matches or exceeds theirs across all measured dimensions."
            : "Few angles detected. Consider waiting for more scrape cycles."}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold uppercase tracking-wider text-slate-700">Stealable angles</h3>
      <p className="mt-1 text-sm text-slate-500">
        Angles {competitorBrandName} uses that {workspaceBrandName} doesn&apos;t
      </p>

      <ul className="mt-4 divide-y divide-slate-200">
        {stealable.map((row, idx) => {
          const ex = examples[row.angle];
          const busy = loadingAngles[row.angle];
          const line = ex?.ad_text?.trim() ?? "";
          const title = `${row.angle} · ${trunc(line || "—", 60)}`;
          const saved = ex?.id ? isAdSaved(savedMap, ex.id) : false;

          return (
            <li
              key={row.angle}
              data-stealable-angle={row.angle}
              className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-start"
            >
              <div className="text-xs font-semibold text-slate-400 tabular-nums">{idx + 1}.</div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="text-xs text-slate-500">
                  {row.totalCount ?? 0} ads
                  {row.platforms?.length ? (
                    <>
                      {" "}
                      ·{" "}
                      <span className="inline-flex items-center gap-1">
                        {row.platforms.slice(0, 4).map((pl) => (
                          <ComparisonPlatformIcon key={pl} platform={pl as StrategyPlatform} className="h-3.5 w-3.5" />
                        ))}
                      </span>
                    </>
                  ) : null}{" "}
                  · Avg life: {row.avgLifespanDays ?? "—"}d
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!ex?.id || saved}
                    onClick={() => void saveAd({ scrapedAdId: ex?.id })}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Bookmark className="h-3 w-3" />
                    {saved ? "Saved" : "Save the example"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void openDrawer(row.angle)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-[var(--rival-accent-blue,#DDF1FD)]"
                  >
                    See all {row.totalCount ?? 0} ads →
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => ex?.id && onOpenAd(ex.id)}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                disabled={busy || !ex}
              >
                {busy ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <RivalLoadingMicro />
                  </div>
                ) : ex?.ad_creative_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ex.ad_creative_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] text-slate-400">No image</span>
                )}
                {ex?.platform ? (
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-white/90 p-0.5 shadow">
                    <ComparisonPlatformIcon platform={ex.platform as StrategyPlatform} className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {remainder > 0 ? (
        <p className="mt-2 text-xs text-slate-500">+ {remainder} more angle gaps (showing top {stealable.length}).</p>
      ) : null}

      {drawerAngle ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          role="presentation"
          onClick={() => setDrawerAngle(null)}
        >
          <div
            role="dialog"
            aria-modal
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">All ads</p>
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{drawerAngle}</p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => setDrawerAngle(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {drawerLoading ? (
                <div className="flex justify-center py-8">
                  <RivalLoadingMicro />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {drawerAds.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onOpenAd(a.id)}
                      className="relative aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                    >
                      {a.ad_creative_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.ad_creative_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="p-1 text-[10px] text-slate-500">{trunc(a.ad_text, 80)}</span>
                      )}
                      <span className="absolute bottom-1 right-1 rounded bg-white/90 p-0.5">
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
