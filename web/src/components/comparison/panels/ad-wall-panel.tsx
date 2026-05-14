"use client";

import { useMemo } from "react";
import { Bookmark } from "lucide-react";

import { useScrapeKeyedCache } from "@/lib/cache/use-scrape-keyed-cache";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { isAdSaved, useSavedAdsStatus } from "@/lib/saved-ads/use-saved-ads";
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

const STAGES: { key: keyof FunnelBuckets; label: string }[] = [
  { key: "TOF", label: "TOP OF FUNNEL" },
  { key: "MOF", label: "MIDDLE OF FUNNEL" },
  { key: "BOF", label: "BOTTOM OF FUNNEL" },
];

function AdThumb({
  ad,
  onOpen,
  showSave,
  saved,
  onSave,
}: {
  ad: WallAdRow;
  onOpen: () => void;
  showSave: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="group relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      <button type="button" onClick={onOpen} className="block h-full w-full">
        {ad.ad_creative_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.ad_creative_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center p-1 text-[9px] text-slate-500">{ad.ad_text.slice(0, 80)}</span>
        )}
      </button>
      <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-white/90 p-0.5 shadow">
        <ComparisonPlatformIcon platform={ad.platform as StrategyPlatform} className="h-4 w-4" />
      </span>
      {showSave ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          className="absolute right-1 top-1 rounded bg-white/90 p-1 opacity-0 shadow transition group-hover:opacity-100"
          aria-label={saved ? "Saved" : "Save ad"}
        >
          <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-amber-500 text-amber-600" : "text-slate-600"}`} />
        </button>
      ) : null}
    </div>
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

  const themIds = useMemo(
    () => (them ? STAGES.flatMap((s) => them[s.key].map((a) => a.id)) : []),
    [them]
  );

  const { savedMap, saveAd } = useSavedAdsStatus(themCompetitorId, [], themIds, cacheDomainNorm);

  if (loading && !them) {
    return (
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold uppercase tracking-wider text-slate-700">Ad wall</h3>
        <RivalLoadingBlock title="Loading ads…" description="Grouping by funnel stage." padded className="py-10" />
      </div>
    );
  }

  if (error?.message) {
    return (
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold uppercase tracking-wider text-slate-700">Ad wall</h3>
        <p className="mt-2 text-sm text-red-700">{error.message}</p>
      </div>
    );
  }

  return (
    <div id="comparison-ad-wall" className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold uppercase tracking-wider text-slate-700">Ad wall</h3>
      <p className="mt-1 text-sm text-slate-500">Their best ads vs yours, grouped by funnel stage</p>

      {!sideBySideAvailable ? (
        <div className="mt-3 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-900">
          Connect your brand to enable side-by-side comparison.
        </div>
      ) : null}

      <div className={`mt-4 space-y-6 ${sideBySideAvailable ? "grid gap-6 lg:grid-cols-2" : ""}`}>
        <div className="space-y-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{themBrandName} (them)</p>
          {STAGES.map(({ key, label }) => {
            const list = them?.[key] ?? [];
            const total = list.length;
            return (
              <div key={key}>
                <p className="mb-2 text-[11px] font-semibold text-slate-700">
                  {label} — {total} ads
                </p>
                {total === 0 ? (
                  <p className="text-xs text-slate-500">No {label.toLowerCase()} activity detected</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {list.slice(0, 8).map((a) => (
                      <AdThumb
                        key={a.id}
                        ad={a}
                        onOpen={() => onOpenAd(a.id)}
                        showSave
                        saved={isAdSaved(savedMap, a.id)}
                        onSave={() => void saveAd({ scrapedAdId: a.id })}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {sideBySideAvailable ? (
          <div className="space-y-5 border-t border-slate-100 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{youBrandName} (you)</p>
            {STAGES.map(({ key, label }) => {
              const list = you?.[key] ?? [];
              const total = list.length;
              return (
                <div key={key}>
                  <p className="mb-2 text-[11px] font-semibold text-slate-700">
                    {label} — {total} ads
                  </p>
                  {total === 0 ? (
                    <p className="text-xs text-slate-500">No {label.toLowerCase()} activity detected</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {list.slice(0, 8).map((a) => (
                        <AdThumb
                          key={a.id}
                          ad={a}
                          onOpen={() => onOpenAd(a.id)}
                          showSave={false}
                          saved={false}
                          onSave={() => {}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
