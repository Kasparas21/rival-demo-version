"use client";

import { AlertTriangle } from "lucide-react";

import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { COMPARISON_PLATFORM_ORDER, ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { ComparisonInsufficient, ComparisonPanelShell } from "@/components/comparison/panel-shell";

type Props = {
  left: { name: string; payload: CompetitorStrategyOverviewPayload | null };
  right: { name: string; payload: CompetitorStrategyOverviewPayload | null };
  leftIsWorkspace: boolean;
};

const PLATFORM_BAR: Record<StrategyPlatform, string> = {
  meta: "#1877F2",
  google: "#4285F4",
  tiktok: "#FF0050",
  linkedin: "#0A66C2",
  pinterest: "#E60023",
  snapchat: "#FFFC00",
};

function formatActiveSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(t);
}

function footprintByPlatform(payload: CompetitorStrategyOverviewPayload | null): Map<
  StrategyPlatform,
  { activeAds: number; earliestFirstSeenAt: string | null | undefined }
> {
  const m = new Map<
    StrategyPlatform,
    { activeAds: number; earliestFirstSeenAt: string | null | undefined }
  >();
  for (const row of payload?.insights.platform_footprint.platforms ?? []) {
    m.set(row.platform, {
      activeAds: row.activeAds,
      earliestFirstSeenAt: row.earliestFirstSeenAt ?? null,
    });
  }
  return m;
}

export function PlatformPresencePanel({ left, right, leftIsWorkspace }: Props) {
  const leftMap = footprintByPlatform(left.payload);
  const rightMap = footprintByPlatform(right.payload);

  const activeLeft = new Set(
    (left.payload?.insights.platform_footprint.platforms ?? []).map((p) => p.platform)
  );
  const activeRight = new Set(
    (right.payload?.insights.platform_footprint.platforms ?? []).map((p) => p.platform)
  );

  const workspaceActive = leftIsWorkspace ? activeLeft : activeRight;
  const competitorActive = leftIsWorkspace ? activeRight : activeLeft;

  const gaps: StrategyPlatform[] = [];
  for (const pl of competitorActive) {
    if (!workspaceActive.has(pl)) gaps.push(pl);
  }

  const maxAdsBoth = Math.max(
    ...(left.payload?.insights.platform_footprint.platforms ?? []).map((p) => p.activeAds),
    ...(right.payload?.insights.platform_footprint.platforms ?? []).map((p) => p.activeAds),
    1
  );

  const GapArrow = () =>
    gaps.length > 0 ? (
      <div className="flex flex-col items-center gap-1 py-1">
        <div className="flex items-center gap-2 w-full max-w-md">
          <div className="flex-1 border-t border-dashed border-red-300" />
          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-semibold text-red-800">
            Gap detected: {gaps.map((g) => g).join(", ")}
          </span>
          <div className="flex-1 border-t border-dashed border-red-300" />
        </div>
      </div>
    ) : null;

  const Bars = ({
    fpMap,
  }: {
    fpMap: Map<StrategyPlatform, { activeAds: number; earliestFirstSeenAt: string | null | undefined }>;
  }) => (
    <div className="space-y-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Total active ads per platform</p>
      {COMPARISON_PLATFORM_ORDER.map((pl) => {
        const row = fpMap.get(pl);
        const n = row?.activeAds ?? 0;
        const pct = maxAdsBoth > 0 ? Math.min(100, Math.round((n / maxAdsBoth) * 100)) : 0;
        return (
          <div key={pl} className="flex items-center gap-2">
            <ComparisonPlatformIcon platform={pl} className="h-4 w-4 shrink-0" />
            <span className="w-16 shrink-0 text-[9px] font-medium capitalize text-slate-600">{pl}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: PLATFORM_BAR[pl] }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-[9px] tabular-nums text-slate-600">{n}</span>
          </div>
        );
      })}
    </div>
  );

  const IconGrid = ({
    name,
    active,
    fpMap,
  }: {
    name: string;
    active: Set<string>;
    fpMap: Map<StrategyPlatform, { activeAds: number; earliestFirstSeenAt: string | null | undefined }>;
  }) => (
    <div className="rounded-xl border border-slate-200/80 bg-white/60 p-3">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600 mb-2">{name}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 auto-rows-fr">
        {COMPARISON_PLATFORM_ORDER.map((pl) => {
          const on = active.has(pl);
          const since = on ? formatActiveSince(fpMap.get(pl)?.earliestFirstSeenAt) : null;
          return (
            <div
              key={pl}
              className={`flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 relative ${
                on ? "border-sky-200/90 bg-white shadow-sm" : "border-slate-100 bg-white/50 opacity-45"
              }`}
            >
              {on ? (
                <span
                  className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500"
                  title="Active"
                />
              ) : null}
              <ComparisonPlatformIcon platform={pl} className="h-10 w-10" />
              <span className="text-[9px] font-medium capitalize text-slate-600">{pl}</span>
              {on && since ? (
                <span className="text-[8px] text-center text-slate-500 leading-tight line-clamp-1">Active since {since}</span>
              ) : !on ? (
                <span className="text-[8px] text-slate-400">—</span>
              ) : (
                <span className="text-[8px] text-slate-400">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <ComparisonPanelShell
      title="Platform presence"
      subtitle="Active platforms in your scraped library"
      tooltip="Compared to platforms with at least one active ad in Strategy Overview. Grey = no ads observed on that platform."
    >
      {!left.payload && !right.payload ? (
        <ComparisonInsufficient message="Load strategy data for both brands to compare platform presence." />
      ) : (
        <div className="flex flex-col gap-3">
          {gaps.length > 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 text-[11px] text-red-900">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <p>
                <span className="font-semibold">Gap detected:</span> Your brand is not active on{" "}
                {gaps.join(", ")} while this competitor is — consider testing those channels.
              </p>
            </div>
          ) : null}
          <GapArrow />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="space-y-3">
              <IconGrid name={left.name} active={activeLeft} fpMap={leftMap} />
              <Bars fpMap={leftMap} />
            </div>
            <div className="space-y-3">
              <IconGrid name={right.name} active={activeRight} fpMap={rightMap} />
              <Bars fpMap={rightMap} />
            </div>
          </div>
        </div>
      )}
    </ComparisonPanelShell>
  );
}
