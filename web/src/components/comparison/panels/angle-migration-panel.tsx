"use client";

import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { ComparisonInsufficient, ComparisonPanelShell } from "@/components/comparison/panel-shell";

type Props = {
  left: { name: string; payload: CompetitorStrategyOverviewPayload | null };
  right: { name: string; payload: CompetitorStrategyOverviewPayload | null };
  leftIsWorkspace: boolean;
};

type Tag = "Shared" | "Gap" | "Advantage";

export function AngleMigrationPanel({ left, right, leftIsWorkspace }: Props) {
  const leftAngles = new Set(
    (left.payload?.insights.angles_by_platform ?? []).map((x) => x.angle)
  );
  const rightAngles = new Set(
    (right.payload?.insights.angles_by_platform ?? []).map((x) => x.angle)
  );

  const workspaceAngles = leftIsWorkspace ? leftAngles : rightAngles;
  const competitorAngles = leftIsWorkspace ? rightAngles : leftAngles;

  const union = new Set<string>([...leftAngles, ...rightAngles]);

  if (union.size === 0) {
    return (
      <ComparisonPanelShell
        title="Angle performance"
        subtitle="Top creative angles by platform mix"
        tooltip="Angles come from enrichment labels. Migration across platforms uses history (planned)."
      >
        <ComparisonInsufficient message="No angle rollups yet — enrich ads and recompute strategy overview." />
      </ComparisonPanelShell>
    );
  }

  const rows = [...union].map((angle) => {
    const inW = workspaceAngles.has(angle);
    const inC = competitorAngles.has(angle);
    let tag: Tag;
    if (inW && inC) tag = "Shared";
    else if (inC && !inW) tag = "Gap";
    else tag = "Advantage";
    const detail =
      (left.payload?.insights.angles_by_platform ?? []).find((x) => x.angle === angle) ??
      (right.payload?.insights.angles_by_platform ?? []).find((x) => x.angle === angle);
    return { angle, tag, detail };
  });

  const tagStyle = (t: Tag) => {
    if (t === "Gap") return "bg-rose-100 text-rose-900";
    if (t === "Advantage") return "bg-emerald-100 text-emerald-900";
    return "bg-slate-100 text-slate-800";
  };

  return (
    <ComparisonPanelShell
      title="Angle performance"
      subtitle="Angles ranked by presence; gap vs shared vs your edge"
      tooltip="Gap = competitor runs this angle, you don’t. Advantage = you run it, they don’t. Shared = both."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] text-left border-collapse min-w-[480px]">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-1.5 pr-2 font-semibold">Angle</th>
              <th className="py-1.5 px-1 font-semibold">Ads</th>
              <th className="py-1.5 px-1 font-semibold">Platforms</th>
              <th className="py-1.5 px-1 font-semibold">Avg life</th>
              <th className="py-1.5 pl-1 font-semibold">Tag</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .sort((a, b) => (b.detail?.totalCount ?? 0) - (a.detail?.totalCount ?? 0))
              .map(({ angle, tag, detail }) => (
                <tr key={angle} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-2 font-medium text-slate-800 max-w-[200px]">
                    <span className="line-clamp-2">{angle}</span>
                  </td>
                  <td className="py-2 px-1 tabular-nums text-slate-700">{detail?.totalCount ?? "—"}</td>
                  <td className="py-2 px-1">
                    <div className="flex flex-wrap gap-1">
                      {(detail?.platforms ?? []).slice(0, 6).map((pl) => (
                        <span key={pl} className="inline-flex" title={pl}>
                          <ComparisonPlatformIcon platform={pl} className="h-4 w-4" />
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-1 text-slate-600 tabular-nums">
                    {detail ? `${detail.avgLifespanDays}d` : "—"}
                  </td>
                  <td className="py-2 pl-1">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold ${tagStyle(tag)}`}>
                      {tag}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] text-slate-400 leading-snug border-t border-slate-100 pt-2">
        Migration tracking (angles scaling from one platform to another) begins after 7+ days of historical snapshots — not
        yet available in this build.
      </p>
    </ComparisonPanelShell>
  );
}
