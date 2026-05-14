"use client";

import type { ComparisonDerivedStats } from "@/lib/comparison/scraped-ads-derived-stats";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { COMPARISON_PLATFORM_ORDER } from "@/components/comparison/platform-icon";

type Props = {
  workspaceName: string;
  competitorName: string;
  workspacePayload: CompetitorStrategyOverviewPayload | null;
  competitorPayload: CompetitorStrategyOverviewPayload | null;
  workspaceDerived: ComparisonDerivedStats;
  competitorDerived: ComparisonDerivedStats;
  /** True when workspace brand has no scrape / incomplete comparison input */
  workspaceDataIncomplete?: boolean;
};

type Cmp = "ahead" | "behind" | "tied" | "neutral";

function pctDiff(a: number, b: number): number {
  const d = Math.abs(a - b);
  const base = Math.max(Math.abs(a), Math.abs(b), 1e-6);
  return d / base;
}

function compareHigherBetter(you: number, them: number, tieTol = 0.1): Cmp {
  if (pctDiff(you, them) <= tieTol) return "tied";
  return you > them ? "ahead" : "behind";
}

type Row = {
  label: string;
  you: string;
  them: string;
  cmp: Cmp;
};

export function SideBySideStatsPanel({
  workspaceName,
  competitorName,
  workspacePayload,
  competitorPayload,
  workspaceDerived,
  competitorDerived,
  workspaceDataIncomplete,
}: Props) {
  const platTotal = COMPARISON_PLATFORM_ORDER.length;

  const youActive = workspacePayload?.map.activeAdCount;
  const themActive = competitorPayload?.map.activeAdCount;
  const youPlat = workspacePayload?.map.platformCount;
  const themPlat = competitorPayload?.map.platformCount;

  const youNew = workspaceDerived.newAdsLast30d;
  const themNew = competitorDerived.newAdsLast30d;

  const youAge = workspaceDerived.avgAdAgeDays;
  const themAge = competitorDerived.avgAdAgeDays;

  const youVideo = workspaceDerived.videoPercent;
  const themVideo = competitorDerived.videoPercent;

  const youAngles = workspaceDerived.uniqueAnglesCount;
  const themAngles = competitorDerived.uniqueAnglesCount;

  const youSpend = workspacePayload?.map.totalAdSpend?.value;
  const themSpend = competitorPayload?.map.totalAdSpend?.value;

  const fmtEuro = (n: number | null | undefined) => {
    if (n == null || !Number.isFinite(n)) return "—";
    if (Math.abs(n) >= 1000) return `€${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
    return `€${Math.round(n).toLocaleString()}`;
  };

  const dashYou = workspaceDataIncomplete || !workspacePayload;
  const dashThem = !competitorPayload;

  const rows: Row[] = [
    {
      label: "Active ads",
      you: dashYou || youActive == null ? "—" : String(youActive),
      them: dashThem || themActive == null ? "—" : String(themActive),
      cmp:
        dashYou || dashThem || youActive == null || themActive == null
          ? "neutral"
          : compareHigherBetter(youActive, themActive),
    },
    {
      label: "Platforms active",
      you: dashYou || youPlat == null ? "—" : `${youPlat} of ${platTotal}`,
      them: dashThem || themPlat == null ? "—" : `${themPlat} of ${platTotal}`,
      cmp:
        dashYou || dashThem || youPlat == null || themPlat == null ? "neutral" : compareHigherBetter(youPlat, themPlat),
    },
    {
      label: "New ads (last 30d)",
      you: dashYou ? "—" : String(youNew),
      them: dashThem ? "—" : String(themNew),
      cmp: dashYou || dashThem ? "neutral" : compareHigherBetter(youNew, themNew),
    },
    {
      label: "Avg ad age",
      you: dashYou ? "—" : `${youAge} days`,
      them: dashThem ? "—" : `${themAge} days`,
      cmp: "neutral",
    },
    {
      label: "Video creative %",
      you: dashYou ? "—" : `${youVideo}%`,
      them: dashThem ? "—" : `${themVideo}%`,
      cmp: dashYou || dashThem ? "neutral" : compareHigherBetter(youVideo, themVideo),
    },
    {
      label: "Unique angles",
      you: dashYou ? "—" : String(youAngles),
      them: dashThem ? "—" : String(themAngles),
      cmp: dashYou || dashThem ? "neutral" : compareHigherBetter(youAngles, themAngles),
    },
    {
      label: "Modeled spend/mo",
      you: dashYou || youSpend == null ? "—" : fmtEuro(youSpend),
      them: dashThem || themSpend == null ? "—" : fmtEuro(themSpend),
      cmp:
        dashYou || dashThem || youSpend == null || themSpend == null
          ? "neutral"
          : compareHigherBetter(youSpend, themSpend),
    },
  ];

  const Indicator = ({ cmp }: { cmp: Cmp }) => {
    if (cmp === "neutral") {
      return <span className="text-xs font-medium text-slate-400">—</span>;
    }
    if (cmp === "tied") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className="h-2 w-2 rounded-full bg-slate-400" />= tied
        </span>
      );
    }
    if (cmp === "ahead") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          ahead → <span className="h-2 w-2 rounded-full bg-[#10B981]" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
        ← behind <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
      </span>
    );
  };

  return (
    <div
      className="mb-6 rounded-2xl bg-white p-6 shadow-sm"
      title={workspaceDataIncomplete ? "Connect and scrape your own brand to enable comparison" : undefined}
    >
      <h3 className="text-base font-semibold uppercase tracking-wider text-slate-700">Head-to-head stats</h3>
      <p className="mt-1 text-sm text-slate-500">You vs them on live scrape rollups.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[520px] w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-3 text-left font-semibold text-[var(--rival-primary,#343434)]" />
              <th className="px-2 py-2 text-left font-semibold text-[var(--rival-primary,#343434)]">YOU</th>
              <th className="px-2 py-2 text-center font-semibold text-[var(--rival-primary,#343434)]" />
              <th className="px-2 py-2 text-left font-semibold text-[var(--rival-primary,#343434)]">THEM</th>
            </tr>
            <tr className="border-b border-slate-200 text-xs font-normal text-slate-500">
              <th className="pb-2 pr-3 text-left" />
              <th className="px-2 pb-2 text-left font-medium text-slate-600">{workspaceName}</th>
              <th className="px-2 pb-2 text-center" />
              <th className="px-2 pb-2 text-left font-medium text-slate-600">{competitorName}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((r) => (
              <tr
                key={r.label}
                className="h-12 hover:bg-[var(--rival-accent-blue,#DDF1FD)]"
                title={
                  workspaceDataIncomplete && r.label !== "Avg ad age"
                    ? "Connect and scrape your own brand to enable comparison"
                    : undefined
                }
              >
                <td className="py-2 pr-3 font-medium text-slate-800">{r.label}</td>
                <td className="px-2 py-2 tabular-nums text-slate-800">{r.you}</td>
                <td className="px-2 py-2 text-center">
                  {r.label === "Avg ad age" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                      Lifespan
                    </span>
                  ) : (
                    <Indicator cmp={r.cmp} />
                  )}
                </td>
                <td className="px-2 py-2 tabular-nums text-slate-800">{r.them}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
