"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
} from "lucide-react";

import { DemoSectionHeader } from "@/components/landing/hero-variant-b-demo/chrome";
import { DemoAdDetailDrawer } from "@/components/demo/demo-ad-detail-drawer";
import { DemoPlatformAdCard } from "@/components/demo/demo-platform-ad-cards";
import { DemoPlatformAdsAllModal } from "@/components/demo/demo-platform-ads-all-modal";
import { DemoPlatformSection } from "@/components/demo/demo-platform-section";
import { primeDemoAdDetailCache } from "@/lib/demo/demo-ad-detail-payload";
import { resolveDemoAdSource } from "@/lib/demo/demo-platform-ads-modal-feed";
import { META_ADS_INLINE_PREVIEW } from "@/lib/ad-library/constants";
import {
  GoogleLogo,
  LinkedInLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
} from "@/components/platform-logos";
import { describeArcClockwise } from "@/lib/charts/arc-geometry";
import { allocateGaugeSegmentSweeps } from "@/lib/charts/gauge-segments";
import { getDemoBrandPayload } from "@/lib/demo/demo-brand-payload";
import type { DemoAd, DemoPlatform } from "@/lib/demo/dashboard-demo-data";

const PLATFORM_CONFIG: {
  id: DemoPlatform;
  label: string;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  sectionLabel: string;
}[] = [
  { id: "meta", label: "Meta", title: "Meta ads", Icon: MetaLogo, sectionLabel: "Meta / Facebook" },
  { id: "google", label: "Google", title: "Google ads", Icon: GoogleLogo, sectionLabel: "Google" },
  { id: "tiktok", label: "TikTok", title: "TikTok ads", Icon: TikTokLogo, sectionLabel: "TikTok" },
  { id: "linkedin", label: "LinkedIn", title: "LinkedIn ads", Icon: LinkedInLogo, sectionLabel: "LinkedIn" },
  { id: "pinterest", label: "Pinterest", title: "Pinterest ads", Icon: PinterestLogo, sectionLabel: "Pinterest" },
  { id: "snapchat", label: "Snapchat", title: "Snapchat ads", Icon: SnapchatLogo, sectionLabel: "Snapchat" },
];

const PLATFORM_COLORS: Record<DemoPlatform, string> = {
  meta: "#1877F2",
  google: "#34A853",
  tiktok: "#000000",
  linkedin: "#0A66C2",
  pinterest: "#E60023",
  snapchat: "#FFFC00",
};

const PLATFORM_ORDER: DemoPlatform[] = ["meta", "google", "tiktok", "linkedin", "pinterest", "snapchat"];
const DEFAULT_VISIBLE: DemoPlatform[] = ["meta", "google", "pinterest", "snapchat", "tiktok", "linkedin"];

const PLATFORM_LABELS: Record<DemoPlatform, string> = {
  meta: "Meta",
  google: "Google",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
};

function DemoGauge({
  activeCounts,
  total,
  totalAll,
}: {
  activeCounts: Record<DemoPlatform, number>;
  total: number;
  totalAll: number;
}) {
  const [hovered, setHovered] = useState<DemoPlatform | null>(null);
  const platformsWithAds = PLATFORM_ORDER.filter((p) => activeCounts[p] > 0).length;
  const size = 190;
  const strokeWidth = 14;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2 - 4;
  const ARC_START = 225;
  const ARC_TOTAL = 270;
  const GAP = 3;
  const sweeps = allocateGaugeSegmentSweeps(
    activeCounts,
    total,
    PLATFORM_ORDER,
    ARC_TOTAL,
    GAP,
    Math.max(0, PLATFORM_ORDER.filter((p) => activeCounts[p] > 0).length - 1),
  );
  let cursor = ARC_START;
  const segments = sweeps.map((s, i) => {
    const startDeg = cursor;
    const endDeg = cursor + s.sweepDeg;
    cursor = endDeg + (i < sweeps.length - 1 ? GAP : 0);
    return { ...s, startDeg, endDeg, color: PLATFORM_COLORS[s.platform as DemoPlatform] };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex w-full justify-center" style={{ height: 158 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible" aria-hidden>
          <path
            d={describeArcClockwise(cx, cy, radius, ARC_START, ARC_START + ARC_TOTAL)}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg) => {
            const platform = seg.platform as DemoPlatform;
            const count = activeCounts[platform];
            const label = PLATFORM_LABELS[platform];
            return (
            <path
              key={seg.platform}
              d={describeArcClockwise(cx, cy, radius, seg.startDeg, seg.endDeg)}
              fill="none"
              stroke={seg.color}
              strokeWidth={hovered === platform ? strokeWidth + 2 : strokeWidth}
              className="cursor-pointer transition-all duration-300"
              style={{ opacity: hovered && hovered !== platform ? 0.25 : 1 }}
              title={`${count} ${label}`}
              onMouseEnter={() => setHovered(platform)}
              onMouseLeave={() => setHovered(null)}
            />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center translate-y-2">
          {hovered ? (
            <>
              <p className="text-[28px] font-bold leading-none" style={{ color: PLATFORM_COLORS[hovered] }}>
                {activeCounts[hovered]}
              </p>
              <p
                className="mt-1 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: PLATFORM_COLORS[hovered] }}
              >
                {PLATFORM_LABELS[hovered]}
              </p>
            </>
          ) : (
            <>
              <p className="text-[28px] font-bold text-[#343434]">{total}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#808080]">ADS RUNNING</p>
              <p className="text-[10px] text-[#808080]">across {platformsWithAds} platforms</p>
            </>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-[#64748b]">
        <span className="font-semibold text-[#475569]">{totalAll}</span> total ads scraped
      </p>
    </div>
  );
}

type SavedAdSnapshot = {
  title: string;
  body: string;
  savedAt: string;
  gradient: string;
};

function SavedAdCard({ ad, onUnsave }: { ad: SavedAdSnapshot; onUnsave: () => void }) {
  return (
    <article className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
      <div className="aspect-[4/3] w-full" style={{ background: ad.gradient }} />
      <div className="space-y-2 p-4">
        <p className="text-[12px] font-semibold leading-snug text-[#111827]">{ad.title}</p>
        <p className="text-[11px] text-[#64748b]">{ad.body}</p>
        <p className="text-[10px] text-[#94a3b8]">Saved {ad.savedAt}</p>
        <button
          type="button"
          onClick={onUnsave}
          className="w-full rounded-lg border border-[#e5e7eb] py-2 text-[12px] font-semibold text-[#64748b] hover:bg-[#f8fafc]"
        >
          Unsave
        </button>
      </div>
    </article>
  );
}

type Props = {
  subTab: "all" | "saved";
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  /** Marketing /adspy pages - lock to one platform and hide the platform picker. */
  lockedPlatform?: DemoPlatform;
  /** Dashboard demo host — switches competitor vs own-brand fixtures. */
  domain?: string;
};

export function DemoAdLibraryView({ subTab, savedIds, onToggleSave, lockedPlatform, domain }: Props) {
  const payload = useMemo(() => getDemoBrandPayload(domain), [domain]);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [visiblePlatforms, setVisiblePlatforms] = useState<DemoPlatform[]>(
    lockedPlatform ? [lockedPlatform] : payload.defaultVisiblePlatforms,
  );
  const [showDemoSaved, setShowDemoSaved] = useState(true);
  const [detailAd, setDetailAd] = useState<DemoAd | null>(null);
  const [viewAllPlatform, setViewAllPlatform] = useState<DemoPlatform | null>(null);

  const openAdDetail = (ad: DemoAd) => {
    const source = resolveDemoAdSource(ad);
    primeDemoAdDetailCache(source);
    setDetailAd(source);
  };

  const totalActive = useMemo(
    () => PLATFORM_ORDER.reduce((sum, p) => sum + payload.platformActiveCounts[p], 0),
    [payload.platformActiveCounts],
  );
  const totalAll = useMemo(
    () => PLATFORM_ORDER.reduce((sum, p) => sum + payload.platformTotalCounts[p], 0),
    [payload.platformTotalCounts],
  );
  const maxLandingAds = Math.max(...payload.landingPages.map((p) => p.ads));

  const visibleAds = useMemo(() => {
    if (subTab === "saved") return [];
    return payload.ads.filter((ad) => visiblePlatforms.includes(ad.platform));
  }, [payload.ads, subTab, visiblePlatforms]);

  const adsByPlatform = useMemo(() => {
    const map = new Map<DemoPlatform, DemoAd[]>();
    for (const ad of visibleAds) {
      const list = map.get(ad.platform) ?? [];
      list.push(ad);
      map.set(ad.platform, list);
    }
    return map;
  }, [visibleAds]);

  const savedFromGrid = payload.ads.filter((ad) => savedIds.has(ad.id));

  if (subTab === "saved") {
    const hasAny = showDemoSaved || savedFromGrid.length > 0;
    return (
      <>
        <DemoSectionHeader
          overline="Saved ads"
          title={`Saved ads from ${payload.name}`}
          description={`${(showDemoSaved ? 1 : 0) + savedFromGrid.length} saved - preserved even if removed from the source`}
        />
        {!hasAny ? (
          <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-6 py-14 text-center">
            <p className="text-[14px] font-medium text-[#475569]">No saved ads yet</p>
            <p className="mt-1 text-[12px] text-[#64748b]">Save creatives from Ad Library to collect them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {showDemoSaved ? <SavedAdCard ad={payload.savedAd} onUnsave={() => setShowDemoSaved(false)} /> : null}
            {savedFromGrid.map((ad) => (
              <DemoPlatformAdCard
                key={ad.id}
                platform={ad.platform}
                ad={ad}
                saved
                onToggleSave={() => onToggleSave(ad.id)}
                onOpen={() => openAdDetail(ad)}
              />
            ))}
          </div>
        )}
      <DemoAdDetailDrawer ad={detailAd} onClose={() => setDetailAd(null)} />
      </>
    );
  }

  return (
    <>
      <DemoSectionHeader
        overline="Ad library"
        title={`Scraped creatives for ${payload.name}`}
        description={
          lockedPlatform
            ? `Last scraped ${payload.lastScraped} · ${PLATFORM_CONFIG.find((p) => p.id === lockedPlatform)?.sectionLabel ?? "Platform"} ads from your latest scrape.`
            : `Last scraped ${payload.lastScraped} · Choose platforms below, then browse each channel section.`
        }
      />

      <section className="mb-4 overflow-hidden rounded-2xl border border-[#cfe8f8]/80 bg-gradient-to-br from-[#e8f4fc]/90 via-[#f8fafc] to-white shadow-sm ring-1 ring-white/80">
        <button
          type="button"
          onClick={() => setAnalyticsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 hover:bg-white/50"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-[#2563eb]" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Analytics</span>
          </div>
          {analyticsOpen ? <ChevronUp className="size-4 text-[#64748b]" /> : <ChevronDown className="size-4 text-[#64748b]" />}
        </button>
        {analyticsOpen ? (
          <div className="hero-demo-analytics-panel grid grid-cols-1 border-t border-[#e2e8f0]/90 lg:grid-cols-3">
            <div className="border-b border-[#e2e8f0]/90 p-4 lg:border-b-0 lg:border-r">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
                Active ads · platform mix
              </p>
              <DemoGauge activeCounts={payload.platformActiveCounts} total={totalActive} totalAll={totalAll} />
            </div>
            <div className="hero-demo-analytics-side grid grid-cols-1 lg:col-span-2 lg:grid-cols-2">
              <div className="border-b border-[#e2e8f0]/90 p-4 lg:border-b-0 lg:border-r">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">Activity score</p>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[30px] font-bold">{payload.activityScore.score}</span>
                  <span className="text-[13px] text-[#64748b]">/100</span>
                  <span className="rounded-md border border-blue-300 bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                    {payload.activityScore.tierLabel}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#475569]">{payload.activityScore.spend}</p>
                <ul className="mt-3 space-y-1.5">
                  {payload.activityScore.reasons.map((r) => (
                    <li key={r} className="flex gap-1.5 text-[11px] text-[#334155]">
                      <Check className="mt-0.5 size-3 shrink-0 text-green-600" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
                  <LinkIcon className="size-3" aria-hidden />
                  Top landing pages
                </p>
                <div className="space-y-2">
                  {payload.landingPages.slice(0, 4).map((page) => (
                    <div key={page.id}>
                      <div className="mb-0.5 flex justify-between gap-2 text-[10px] sm:text-[11px]">
                        <span className="truncate font-mono">{page.url}</span>
                        <span className="font-semibold">{page.ads}</span>
                      </div>
                      <div
                        className="flex h-1.5 overflow-hidden rounded-full bg-[#e8eff5]"
                        style={{ width: `${(page.ads / maxLandingAds) * 100}%` }}
                      >
                        {Object.entries(page.platforms).map(([platform, count]) => (
                          <div
                            key={platform}
                            className="h-full min-w-[2px]"
                            style={{
                              width: `${(count / page.ads) * 100}%`,
                              backgroundColor: PLATFORM_COLORS[platform as DemoPlatform],
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {!lockedPlatform ? (
        <div className="mb-5 rounded-2xl border border-[#e5e7eb]/70 bg-[#DDF1FD]/25 px-3 py-2 sm:px-4">
          <p className="text-[12px] font-semibold text-[#374151]">Choose which platforms to show</p>
          <div
            role="toolbar"
            className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(68px,1fr))] gap-1.5 rounded-xl border border-[#e5e7eb]/90 bg-white/85 p-1.5"
          >
            {PLATFORM_CONFIG.map(({ id, label, title, Icon }) => {
              const on = visiblePlatforms.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  title={title}
                  data-demo-interactive
                  onClick={() =>
                    setVisiblePlatforms((prev) =>
                      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
                    )
                  }
                  className={`relative flex flex-col items-center rounded-lg border-2 px-1 py-1.5 transition-all active:scale-[0.98] ${
                    on ? "border-[#4a7fa5] bg-[#DDF1FD]/90 shadow-sm" : "border-dashed border-[#cbd5e1] bg-[#f8fafc]"
                  }`}
                >
                  <Icon className={`size-7 ${on ? "opacity-100" : "opacity-50"}`} />
                  <span className="mt-0.5 text-[10px] font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {visibleAds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-6 py-12 text-center">
          <p className="font-medium text-[#475569]">No platforms selected</p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {PLATFORM_CONFIG.filter((c) => visiblePlatforms.includes(c.id)).map(({ id }) => {
            const ads = adsByPlatform.get(id);
            if (!ads?.length) return null;
            return (
              <DemoPlatformSection
                key={id}
                platform={id}
                lastScraped={payload.lastScraped}
                totalCount={payload.platformActiveCounts[id]}
                onViewAll={() => setViewAllPlatform(id)}
              >
                {ads.slice(0, META_ADS_INLINE_PREVIEW).map((ad) => (
                  <div key={ad.id} className="flex h-full min-h-0 flex-col">
                    <DemoPlatformAdCard
                      platform={id}
                      ad={ad}
                      saved={savedIds.has(ad.id)}
                      onToggleSave={() => onToggleSave(ad.id)}
                      onOpen={() => openAdDetail(ad)}
                    />
                  </div>
                ))}
              </DemoPlatformSection>
            );
          })}
        </div>
      )}
      {viewAllPlatform ? (
        <DemoPlatformAdsAllModal
          open
          onClose={() => setViewAllPlatform(null)}
          platform={viewAllPlatform}
          baseAds={payload.ads}
          displayTotal={payload.platformActiveCounts[viewAllPlatform]}
          savedIds={savedIds}
          onToggleSave={onToggleSave}
          onOpenAd={openAdDetail}
        />
      ) : null}
      <DemoAdDetailDrawer ad={detailAd} onClose={() => setDetailAd(null)} />
    </>
  );
}
