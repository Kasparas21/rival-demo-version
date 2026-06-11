"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Link as LinkIcon,
  Play,
} from "lucide-react";

import { DemoSectionHeader, GenericLogo } from "@/components/landing/hero-variant-b-demo/chrome";
import {
  GoogleLogo,
  MetaLogo,
  PinterestLogo,
  SnapchatLogo,
  TikTokLogo,
} from "@/components/platform-logos";
import { describeArcClockwise } from "@/lib/charts/arc-geometry";
import { allocateGaugeSegmentSweeps } from "@/lib/charts/gauge-segments";
import {
  DEMO_ACTIVITY_SCORE,
  DEMO_ADS,
  DEMO_COMPETITOR,
  DEMO_LANDING_PAGES,
  DEMO_PLATFORM_ACTIVE_COUNTS,
  DEMO_PLATFORM_TOTAL_COUNTS,
  DEMO_SAVED_AD,
  type DemoAd,
  type DemoPlatform,
} from "@/lib/landing/hero-variant-b-demo-data";

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
  { id: "pinterest", label: "Pinterest", title: "Pinterest ads", Icon: PinterestLogo, sectionLabel: "Pinterest" },
  { id: "snapchat", label: "Snapchat", title: "Snapchat ads", Icon: SnapchatLogo, sectionLabel: "Snapchat" },
];

const PLATFORM_COLORS: Record<DemoPlatform, string> = {
  meta: "#1877F2",
  google: "#34A853",
  tiktok: "#000000",
  pinterest: "#E60023",
  snapchat: "#FFFC00",
};

const PLATFORM_ORDER: DemoPlatform[] = ["meta", "google", "tiktok", "pinterest", "snapchat"];
const DEFAULT_VISIBLE: DemoPlatform[] = ["meta", "google", "pinterest", "snapchat"];

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
          {segments.map((seg) => (
            <path
              key={seg.platform}
              d={describeArcClockwise(cx, cy, radius, seg.startDeg, seg.endDeg)}
              fill="none"
              stroke={seg.color}
              strokeWidth={hovered === seg.platform ? strokeWidth + 2 : strokeWidth}
              className="transition-all duration-300"
              style={{ opacity: hovered && hovered !== seg.platform ? 0.25 : 1 }}
              onMouseEnter={() => setHovered(seg.platform as DemoPlatform)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center translate-y-2">
          {hovered ? (
            <p className="text-[28px] font-bold" style={{ color: PLATFORM_COLORS[hovered] }}>
              {activeCounts[hovered]}
            </p>
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

function DemoAdCard({
  ad,
  saved,
  onToggleSave,
}: {
  ad: DemoAd;
  saved: boolean;
  onToggleSave: () => void;
}) {
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-2.5 border-b border-[#f1f5f9] p-3">
        <GenericLogo className="size-9 rounded-full text-[11px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[#343434]">{ad.pageName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#6b7280]">
            Sponsored <Globe className="size-3 text-[#9ca3af]" aria-hidden />
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[10px] text-[#6b7280]">
          <span className="size-1.5 rounded-full bg-green-500" aria-hidden />
          <span className="font-medium">Active {ad.activeDays}D</span>
        </div>
      </div>
      <p className="line-clamp-3 px-3 pt-2.5 text-[12px] text-[#374151]">{ad.body}</p>
      <div className="relative mx-3 mt-2.5 overflow-hidden rounded-xl">
        <div
          className="aspect-[4/5] max-h-[180px] w-full sm:max-h-[200px]"
          style={{ background: ad.gradient }}
        >
          {ad.isVideo ? (
            <span className="flex h-full items-center justify-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-black/50 text-white">
                <Play className="ml-0.5 size-4" fill="currentColor" aria-hidden />
              </span>
            </span>
          ) : null}
        </div>
      </div>
      <div className="mx-3 mt-2.5 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-2.5">
        <p className="truncate font-mono text-[10px] text-[#6b7280]">{ad.siteLabel}</p>
        <p className="mt-0.5 truncate text-[12px] font-semibold">{ad.headline}</p>
        <span className="mt-2 inline-flex rounded-md bg-[#e5e7eb] px-2.5 py-1 text-[11px] font-semibold">
          {ad.cta}
        </span>
      </div>
      <button
        type="button"
        onClick={onToggleSave}
        className={`mx-3 mb-3 mt-2.5 rounded-lg py-2.5 text-[12px] font-semibold transition-colors ${
          saved ? "bg-[#1e293b] text-white" : "bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0]"
        }`}
      >
        {saved ? "Saved" : "Save the Ad"}
      </button>
    </article>
  );
}

function SavedAdCard({ onUnsave }: { onUnsave: () => void }) {
  const ad = DEMO_SAVED_AD;
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
};

export function DemoAdLibraryView({ subTab, savedIds, onToggleSave }: Props) {
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [visiblePlatforms, setVisiblePlatforms] = useState<DemoPlatform[]>(DEFAULT_VISIBLE);
  const [showDemoSaved, setShowDemoSaved] = useState(true);

  const totalActive = useMemo(
    () => PLATFORM_ORDER.reduce((sum, p) => sum + DEMO_PLATFORM_ACTIVE_COUNTS[p], 0),
    [],
  );
  const totalAll = useMemo(
    () => PLATFORM_ORDER.reduce((sum, p) => sum + DEMO_PLATFORM_TOTAL_COUNTS[p], 0),
    [],
  );
  const maxLandingAds = Math.max(...DEMO_LANDING_PAGES.map((p) => p.ads));

  const visibleAds = useMemo(() => {
    if (subTab === "saved") return [];
    return DEMO_ADS.filter((ad) => visiblePlatforms.includes(ad.platform));
  }, [subTab, visiblePlatforms]);

  const adsByPlatform = useMemo(() => {
    const map = new Map<DemoPlatform, DemoAd[]>();
    for (const ad of visibleAds) {
      const list = map.get(ad.platform) ?? [];
      list.push(ad);
      map.set(ad.platform, list);
    }
    return map;
  }, [visibleAds]);

  const savedFromGrid = DEMO_ADS.filter((ad) => savedIds.has(ad.id));

  if (subTab === "saved") {
    const hasAny = showDemoSaved || savedFromGrid.length > 0;
    return (
      <>
        <DemoSectionHeader
          overline="Saved ads"
          title={`Saved ads from ${DEMO_COMPETITOR.name}`}
          description={`${(showDemoSaved ? 1 : 0) + savedFromGrid.length} saved — preserved even if removed from the source`}
        />
        {!hasAny ? (
          <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-6 py-14 text-center">
            <p className="text-[14px] font-medium text-[#475569]">No saved ads yet</p>
            <p className="mt-1 text-[12px] text-[#64748b]">Save creatives from All Ads to collect them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {showDemoSaved ? <SavedAdCard onUnsave={() => setShowDemoSaved(false)} /> : null}
            {savedFromGrid.map((ad) => (
              <DemoAdCard key={ad.id} ad={ad} saved onToggleSave={() => onToggleSave(ad.id)} />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <DemoSectionHeader
        overline="Ad library"
        title={`Scraped creatives for ${DEMO_COMPETITOR.name}`}
        description={`Last scraped ${DEMO_COMPETITOR.lastScraped} · Choose platforms below, then browse each channel section.`}
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
              <DemoGauge activeCounts={DEMO_PLATFORM_ACTIVE_COUNTS} total={totalActive} totalAll={totalAll} />
            </div>
            <div className="hero-demo-analytics-side grid grid-cols-1 lg:col-span-2 lg:grid-cols-2">
              <div className="border-b border-[#e2e8f0]/90 p-4 lg:border-b-0 lg:border-r">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">Activity score</p>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[30px] font-bold">{DEMO_ACTIVITY_SCORE.score}</span>
                  <span className="text-[13px] text-[#64748b]">/100</span>
                  <span className="rounded-md border border-blue-300 bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                    {DEMO_ACTIVITY_SCORE.tierLabel}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#475569]">{DEMO_ACTIVITY_SCORE.spend}</p>
                <ul className="mt-3 space-y-1.5">
                  {DEMO_ACTIVITY_SCORE.reasons.map((r) => (
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
                  {DEMO_LANDING_PAGES.slice(0, 4).map((page) => (
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

      {visibleAds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-6 py-12 text-center">
          <p className="font-medium text-[#475569]">No platforms selected</p>
        </div>
      ) : (
        <div className="space-y-8">
          {PLATFORM_CONFIG.filter((c) => visiblePlatforms.includes(c.id)).map(({ id, sectionLabel }) => {
            const ads = adsByPlatform.get(id);
            if (!ads?.length) return null;
            return (
              <section key={id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-[15px] font-semibold">{sectionLabel}</h4>
                  <span className="text-[12px] font-semibold text-[#2563eb]">
                    View all {DEMO_PLATFORM_ACTIVE_COUNTS[id]} ads
                  </span>
                </div>
                <div className="hero-demo-ad-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {ads.map((ad) => (
                    <DemoAdCard
                      key={ad.id}
                      ad={ad}
                      saved={savedIds.has(ad.id)}
                      onToggleSave={() => onToggleSave(ad.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
