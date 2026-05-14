"use client";

import type {
  AnglesByPlatformInsight,
  CompetitorStrategyOverviewPayload,
  StrategyPlatform,
} from "@/lib/strategy-overview/payload-types";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { ComparisonInsufficient, ComparisonPanelShell } from "@/components/comparison/panel-shell";

type Props = {
  workspace: { name: string; payload: CompetitorStrategyOverviewPayload | null };
  competitor: { name: string; payload: CompetitorStrategyOverviewPayload | null };
};

type Tag = "Shared" | "Theirs only" | "Yours only";

function detailForAngle(payload: CompetitorStrategyOverviewPayload | null, angle: string): AnglesByPlatformInsight | undefined {
  return (payload?.insights.angles_by_platform ?? []).find((x) => x.angle === angle);
}

export function AngleMigrationPanel({ workspace, competitor }: Props) {
  const workspaceAngles = new Set(
    (workspace.payload?.insights.angles_by_platform ?? []).map((x) => x.angle)
  );
  const competitorAngles = new Set(
    (competitor.payload?.insights.angles_by_platform ?? []).map((x) => x.angle)
  );

  const union = new Set<string>([...workspaceAngles, ...competitorAngles]);

  if (union.size === 0) {
    return (
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold uppercase tracking-wider text-slate-700">Full angle breakdown</h3>
        <p className="mt-1 text-sm text-slate-500">Every angle detected across both brands, classified.</p>
        <div className="mt-4">
          <ComparisonInsufficient message="No angle rollups yet — enrich ads and recompute strategy overview." />
        </div>
      </div>
    );
  }

  const rows = [...union].map((angle) => {
    const inW = workspaceAngles.has(angle);
    const inC = competitorAngles.has(angle);
    let tag: Tag;
    if (inW && inC) tag = "Shared";
    else if (inC && !inW) tag = "Theirs only";
    else tag = "Yours only";

    const wDetail = detailForAngle(workspace.payload, angle);
    const cDetail = detailForAngle(competitor.payload, angle);

    return { angle, tag, wDetail, cDetail };
  });

  const tagStyle = (t: Tag) => {
    if (t === "Theirs only") return "bg-amber-100 text-amber-900 border border-amber-200/80";
    if (t === "Yours only") return "bg-emerald-100 text-emerald-900 border border-emerald-200/80";
    return "bg-slate-100 text-slate-800 border border-slate-200/80";
  };

  const formatAdsCell = (tag: Tag, wDetail?: AnglesByPlatformInsight, cDetail?: AnglesByPlatformInsight) => {
    if (tag === "Shared") {
      const w = wDetail?.totalCount ?? "—";
      const t = cDetail?.totalCount ?? "—";
      return (
        <span className="text-slate-700">
          <span className="font-medium text-slate-800">{workspace.name}:</span> {w}
          <span className="mx-1 text-slate-400">·</span>
          <span className="font-medium text-slate-800">{competitor.name}:</span> {t}
        </span>
      );
    }
    if (tag === "Theirs only") {
      return <span className="tabular-nums text-slate-700">{cDetail?.totalCount ?? "—"}</span>;
    }
    return <span className="tabular-nums text-slate-700">{wDetail?.totalCount ?? "—"}</span>;
  };

  const formatPlatformsCell = (tag: Tag, wDetail?: AnglesByPlatformInsight, cDetail?: AnglesByPlatformInsight) => {
    const renderList = (platforms: string[]) => (
      <div className="flex flex-wrap gap-1">
        {platforms.slice(0, 6).map((pl) => (
          <span key={pl} className="inline-flex" title={pl}>
            <ComparisonPlatformIcon platform={pl as StrategyPlatform} className="h-4 w-4" />
          </span>
        ))}
      </div>
    );

    if (tag === "Shared") {
      return (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[9px] font-semibold uppercase text-slate-500">{workspace.name}</span>
            {renderList(wDetail?.platforms ?? [])}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[9px] font-semibold uppercase text-slate-500">{competitor.name}</span>
            {renderList(cDetail?.platforms ?? [])}
          </div>
        </div>
      );
    }
    if (tag === "Theirs only") {
      return renderList(cDetail?.platforms ?? []);
    }
    return renderList(wDetail?.platforms ?? []);
  };

  const formatLifeCell = (tag: Tag, wDetail?: AnglesByPlatformInsight, cDetail?: AnglesByPlatformInsight) => {
    if (tag === "Shared") {
      const w = wDetail != null ? `${wDetail.avgLifespanDays}d` : "—";
      const t = cDetail != null ? `${cDetail.avgLifespanDays}d` : "—";
      return (
        <span className="text-slate-600">
          {workspace.name}: {w} · {competitor.name}: {t}
        </span>
      );
    }
    if (tag === "Theirs only") {
      return <span className="tabular-nums text-slate-600">{cDetail != null ? `${cDetail.avgLifespanDays}d` : "—"}</span>;
    }
    return <span className="tabular-nums text-slate-600">{wDetail != null ? `${wDetail.avgLifespanDays}d` : "—"}</span>;
  };

  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold uppercase tracking-wider text-slate-700">Full angle breakdown</h3>
      <p className="mt-1 text-sm text-slate-500">Every angle detected across both brands, classified.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[520px] w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="divide-y border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-2 font-semibold text-[var(--rival-primary,#343434)]">Angle</th>
              <th className="px-1 py-2 font-semibold text-[var(--rival-primary,#343434)]">Ads</th>
              <th className="px-1 py-2 font-semibold text-[var(--rival-primary,#343434)]">Platforms</th>
              <th className="px-1 py-2 font-semibold text-[var(--rival-primary,#343434)]">Avg life</th>
              <th className="py-2 pl-1 font-semibold text-[var(--rival-primary,#343434)]">Tag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows
              .sort((a, b) => {
                const maxA = Math.max(a.wDetail?.totalCount ?? 0, a.cDetail?.totalCount ?? 0);
                const maxB = Math.max(b.wDetail?.totalCount ?? 0, b.cDetail?.totalCount ?? 0);
                return maxB - maxA;
              })
              .map(({ angle, tag, wDetail, cDetail }) => (
                <tr key={angle} className="align-top text-slate-800 [height:48px] hover:bg-[var(--rival-accent-blue,#DDF1FD)]">
                  <td className="max-w-[220px] py-2 pr-2 font-medium">
                    <span className="line-clamp-2">{angle}</span>
                  </td>
                  <td className="px-1 py-2">{formatAdsCell(tag, wDetail, cDetail)}</td>
                  <td className="px-1 py-2">{formatPlatformsCell(tag, wDetail, cDetail)}</td>
                  <td className="px-1 py-2 tabular-nums">{formatLifeCell(tag, wDetail, cDetail)}</td>
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
    </div>
  );
}
