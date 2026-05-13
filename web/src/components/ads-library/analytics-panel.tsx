"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, ChevronDown, ChevronUp, Link as LinkIcon } from "lucide-react";

import { ActivityScorePanel } from "@/components/competitor/activity-score-panel";
import { describeArcClockwise } from "@/lib/charts/arc-geometry";
import { allocateGaugeSegmentSweeps } from "@/lib/charts/gauge-segments";
import { RivalLoadingMicro } from "@/components/ui/rival-loading";

type LandingPageGroup = {
  groupId: string;
  url: string;
  displayUrl: string;
  totalAds: number;
  activeAds: number;
  platformBreakdown: Record<string, number>;
};

type LandingPagesResponse = {
  ok: boolean;
  landingPages?: LandingPageGroup[];
  error?: string;
};

type Props = {
  competitorId: string;
  platformCounts: {
    meta: number;
    google: number;
    tiktok: number;
    linkedin: number;
    pinterest: number;
    snapchat: number;
  };
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
};

const PLATFORM_ORDER = ["meta", "google", "tiktok", "linkedin", "pinterest", "snapchat"] as const;

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#1877F2",
  google: "#34A853",
  tiktok: "#000000",
  linkedin: "#0A66C2",
  pinterest: "#E60023",
  snapchat: "#FFFC00",
};

const PLATFORM_COLORS_HOVER: Record<string, string> = {
  meta: "#0F5DC3",
  google: "#1E8E3E",
  tiktok: "#000000",
  linkedin: "#08518E",
  pinterest: "#B30019",
  snapchat: "#E6E300",
};

const PLATFORM_TEXT_COLORS: Record<string, string> = {
  meta: "#1877F2",
  google: "#34A853",
  tiktok: "#000000",
  linkedin: "#0A66C2",
  pinterest: "#E60023",
  snapchat: "#B8B600",
};

export function AdLibraryAnalyticsPanel({ competitorId, platformCounts }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [landingPages, setLandingPages] = useState<LandingPageGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!competitorId) return;
    let cancelled = false;
    setLoading(true);

    fetch(`/api/landing-pages?competitorId=${encodeURIComponent(competitorId)}`)
      .then((r) => r.json())
      .then((lpRes: LandingPagesResponse) => {
        if (cancelled) return;
        if (lpRes.ok && lpRes.landingPages) {
          setLandingPages(lpRes.landingPages.slice(0, 5));
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [competitorId]);

  const totalActiveAds = useMemo(
    () => Object.values(platformCounts).reduce((sum, n) => sum + n, 0),
    [platformCounts]
  );

  const platformsWithAds = useMemo(
    () => Object.values(platformCounts).filter((n) => n > 0).length,
    [platformCounts]
  );

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-[#cfe8f8]/80 bg-gradient-to-br from-[#e8f4fc]/90 via-[#f8fafc]/95 to-white shadow-[0_2px_8px_rgba(15,23,42,0.06)] ring-1 ring-white/80">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-white/50"
      >
        <div className="flex min-w-0 flex-col items-start gap-0.5 text-left sm:flex-row sm:items-center sm:gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 shrink-0 text-[#2563eb]" aria-hidden />
            <span className="text-[14px] font-semibold text-[#0f172a]">Analytics</span>
          </div>
          <span className="hidden text-[11px] text-[#64748b] sm:inline sm:pl-1">·</span>
          <span className="text-[11px] font-medium text-[#64748b]">Across all platforms</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-[#64748b]" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-[#64748b]" aria-hidden />
        )}
      </button>

      {expanded ? (
        <div className="grid grid-cols-1 gap-0 border-t border-[#e2e8f0]/90 lg:grid-cols-3">
          <div className="min-h-0 border-b border-[#e2e8f0]/90 p-5 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
                Active ads · platform mix
              </span>
            </div>
            <PlatformDistributionGauge
              total={totalActiveAds}
              platformsCount={platformsWithAds}
              counts={platformCounts}
            />
          </div>

          <div className="border-b border-[#e2e8f0]/90 p-5 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-center gap-1.5">
              <LinkIcon className="h-3 w-3 shrink-0 text-[#64748b]" aria-hidden />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
                Top landing pages
              </span>
            </div>
            <LandingPagesList groups={landingPages} loading={loading} />
          </div>

          <div className="p-5">
            <div className="mb-3 flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3 w-3 shrink-0 text-[#64748b]" aria-hidden />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
                  Activity score
                </span>
              </div>
              <p className="text-[10px] text-[#64748b]">Operational footprint in this market</p>
            </div>
            <ActivityScorePanel competitorId={competitorId} variant="analytics" />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PlatformDistributionGauge({
  total,
  platformsCount,
  counts,
}: {
  total: number;
  platformsCount: number;
  counts: Props["platformCounts"];
}) {
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);

  if (total === 0) {
    return (
      <div className="py-4 text-[11px] italic text-[#94a3b8]">No active ads found across platforms.</div>
    );
  }

  const centerSublabel = `across ${platformsCount} ${platformsCount === 1 ? "platform" : "platforms"}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex w-full justify-center" style={{ height: 190 }}>
        <GaugeArc
          counts={counts}
          total={total}
          hoveredPlatform={hoveredPlatform}
          onHover={setHoveredPlatform}
          centerLabel={String(total)}
          centerSublabel={centerSublabel}
        />
      </div>

      <div className="mt-2 w-full space-y-1.5">
        {PLATFORM_ORDER.map((platform) => {
          const count = counts[platform];
          if (count === 0) return null;
          const pct = Math.round((count / total) * 100);
          const isHovered = hoveredPlatform === platform;
          const isOther = hoveredPlatform !== null && hoveredPlatform !== platform;

          return (
            <div
              key={platform}
              onMouseEnter={() => setHoveredPlatform(platform)}
              onMouseLeave={() => setHoveredPlatform(null)}
              className={`flex cursor-default items-center justify-between gap-2 rounded-md px-1.5 py-1 text-[12px] transition-all duration-300 ease-out ${
                isHovered ? "bg-[#f1f5f9]" : ""
              } ${isOther ? "opacity-40" : "opacity-100"}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm transition-transform duration-300 ease-out"
                  style={{
                    backgroundColor: PLATFORM_COLORS[platform],
                    transform: isHovered ? "scale(1.15)" : "scale(1)",
                    boxShadow: platform === "snapchat" ? "inset 0 0 0 1px rgba(0,0,0,0.12)" : undefined,
                  }}
                />
                <span
                  className={`truncate transition-colors duration-300 ease-out ${
                    isHovered ? "font-semibold" : "font-medium"
                  }`}
                  style={{
                    color: isHovered ? PLATFORM_TEXT_COLORS[platform] : "#0f172a",
                  }}
                >
                  {PLATFORM_LABELS[platform]}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2 font-mono">
                <span className={isHovered ? "font-semibold text-[#0f172a]" : "text-[#0f172a]"}>{count}</span>
                <span className="text-[#cbd5e1]">·</span>
                <span className={isHovered ? "font-semibold text-[#0f172a]" : "text-[#64748b]"}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type GaugeArcProps = {
  counts: Props["platformCounts"];
  total: number;
  hoveredPlatform: string | null;
  onHover: (p: string | null) => void;
  centerLabel: string;
  centerSublabel: string;
};

function GaugeArc({
  counts,
  total,
  hoveredPlatform,
  onHover,
  centerLabel,
  centerSublabel,
}: GaugeArcProps) {
  const size = 220;
  const strokeWidth = 16;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2 - 6;

  /** 0° = top, clockwise. Open 90° at bottom (6 o'clock), sweep through left → top → right. */
  const ARC_START_DEG = 225;
  const ARC_TOTAL_DEG = 270;
  const ARC_END_DEG = ARC_START_DEG + ARC_TOTAL_DEG;
  const GAP_DEG = 3;

  const activeSegments = PLATFORM_ORDER.filter((p) => counts[p] > 0).map((platform) => ({
    platform,
    count: counts[platform],
    color: PLATFORM_COLORS[platform],
  }));

  const numGaps = Math.max(0, activeSegments.length - 1);
  const sweeps = allocateGaugeSegmentSweeps(counts, total, PLATFORM_ORDER, ARC_TOTAL_DEG, GAP_DEG, numGaps);

  let cursor = ARC_START_DEG;
  const segments = sweeps.map((s, i) => {
    const meta = activeSegments.find((a) => a.platform === s.platform)!;
    const startDeg = cursor;
    const endDeg = cursor + s.sweepDeg;
    const isLast = i === sweeps.length - 1;
    cursor = endDeg + (isLast ? 0 : GAP_DEG);
    return {
      platform: s.platform,
      count: s.count,
      color: meta.color,
      startDeg,
      endDeg,
      sweep: s.sweepDeg,
    };
  });

  const trackD = describeArcClockwise(cx, cy, radius, ARC_START_DEG, ARC_END_DEG);

  return (
    <div className="relative" style={{ width: size, height: size * 0.78 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        style={{ display: "block" }}
        aria-hidden
      >
        <path
          d={trackD}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
        />

        {segments.map((seg) => {
          const isHovered = hoveredPlatform === seg.platform;
          const isOther = hoveredPlatform !== null && hoveredPlatform !== seg.platform;
          const d = describeArcClockwise(cx, cy, radius, seg.startDeg, seg.endDeg);
          const opacity = isOther ? 0.25 : 1;
          const activeStroke = isHovered ? PLATFORM_COLORS_HOVER[seg.platform] : seg.color;
          const sw = isHovered ? strokeWidth + 2 : strokeWidth;

          return (
            <path
              key={seg.platform}
              d={d}
              fill="none"
              stroke={activeStroke}
              strokeWidth={sw}
              strokeLinecap="butt"
              className="cursor-pointer transition-[stroke-width,opacity] duration-300 ease-out"
              style={{ opacity }}
              onMouseEnter={() => onHover(seg.platform)}
              onMouseLeave={() => onHover(null)}
            />
          );
        })}
      </svg>

      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        style={{ transform: `translateY(${size * 0.095}px)` }}
      >
        <div className="text-center">
          {hoveredPlatform ? (
            <HoveredPlatformLabel
              platform={hoveredPlatform}
              count={counts[hoveredPlatform as keyof Props["platformCounts"]] ?? 0}
              total={total}
            />
          ) : (
            <>
              <p className="text-[36px] font-bold leading-none tracking-tight text-[#343434]">{centerLabel}</p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#808080]">ADS RUNNING</p>
              <p className="mt-0.5 text-[10px] font-normal text-[#808080]">
                {centerSublabel.replace(/^ads /i, "")}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HoveredPlatformLabel({
  platform,
  count,
  total,
}: {
  platform: string;
  count: number;
  total: number;
}) {
  const pct = Math.round((count / total) * 100);
  const c = PLATFORM_TEXT_COLORS[platform] ?? "#343434";
  return (
    <>
      <p className="text-[36px] font-bold leading-none tracking-tight transition-colors duration-200 ease-out" style={{ color: c }}>
        {count}
      </p>
      <p
        className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 ease-out"
        style={{ color: c }}
      >
        {PLATFORM_LABELS[platform] ?? platform}
      </p>
      <p className="mt-0.5 text-[10px] font-normal text-[#808080]">{pct}% of total</p>
    </>
  );
}

function LandingPagesList({ groups, loading }: { groups: LandingPageGroup[]; loading: boolean }) {
  if (loading) {
    return <RivalLoadingMicro caption="Loading landing pages…" />;
  }

  if (groups.length === 0) {
    return <div className="py-4 text-[11px] italic text-[#94a3b8]">No landing pages yet.</div>;
  }

  const maxAds = Math.max(...groups.map((g) => g.totalAds));

  return (
    <div className="space-y-2.5">
      {groups.map((group) => {
        const platformsInUrl = Object.entries(group.platformBreakdown)
          .filter(([, n]) => n > 0)
          .sort((a, b) => b[1] - a[1]);
        const widthPct = maxAds > 0 ? (group.totalAds / maxAds) * 100 : 100;

        return (
          <div key={group.groupId}>
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[11px] text-[#0f172a]" title={group.url}>
                {group.displayUrl}
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-[#0f172a]">{group.totalAds}</span>
            </div>
            <div
              className="flex h-1.5 max-w-full overflow-hidden rounded-full bg-[#e8eff5]"
              style={{ width: `${widthPct}%` }}
            >
              {platformsInUrl.map(([platform, count]) => (
                <div
                  key={platform}
                  className="h-full min-w-[2px]"
                  style={{
                    backgroundColor: PLATFORM_COLORS[platform] ?? "#94a3b8",
                    width: `${(count / group.totalAds) * 100}%`,
                  }}
                  title={`${PLATFORM_LABELS[platform] ?? platform}: ${count}`}
                />
              ))}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {platformsInUrl.slice(0, 4).map(([platform, count]) => (
                <span key={platform} className="text-[10px] text-[#64748b]">
                  <span className="font-medium" style={{ color: PLATFORM_COLORS[platform] ?? "#64748b" }}>
                    {PLATFORM_LABELS[platform] ?? platform}
                  </span>
                  : {count}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
