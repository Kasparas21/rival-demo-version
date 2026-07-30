"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, BarChart3, ExternalLink, Loader2, Trophy } from "lucide-react";

import { DiscoveryStatsDateToolbar } from "@/components/discovery/discovery-stats-date-toolbar";
import { DiscoveryToolbar } from "@/components/discovery/discovery-toolbar";
import { StatsDrilldownPanel } from "@/components/discovery/stats-drilldown-panel";
import { useDiscoveryStats } from "@/components/discovery/use-discovery-stats";
import type { DiscoveryToolbarState } from "@/components/discovery/discovery-types";
import { CompetitorLogo } from "@/components/shared/competitor-logo";
import { buildCompetitorDashboardPath } from "@/lib/competitor-dashboard-url";
import type {
  DiscoveryStatsCompetitorRow,
  DiscoveryStatsDrilldownRef,
  DiscoveryStatsHighlight,
  DiscoveryStatsLongestAd,
} from "@/lib/discovery/types";
import { cn } from "@/lib/utils";

type Props = {
  brandId: string;
  toolbar: DiscoveryToolbarState;
  onToolbarChange: (patch: Partial<DiscoveryToolbarState>) => void;
  clientBrands: { id: string; name: string }[];
  activeBrand: { id: string; name: string };
  onOpenAd: (adId: string) => void;
  onNavigateToFeed: (patch: Partial<DiscoveryToolbarState>, tab?: "explore" | "ultimate" | "whats_new") => void;
};

type ActiveDrilldown = DiscoveryStatsDrilldownRef & { title?: string };

type LeaderboardSortKey =
  | "name"
  | "active_ads"
  | "launched_in_period"
  | "killed_in_period"
  | "net_change"
  | "ultimate_winners"
  | "longest_ad_days"
  | "total_days_running";

function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortDesc,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: LeaderboardSortKey;
  activeSortKey: LeaderboardSortKey | null;
  sortDesc: boolean;
  onSort: (key: LeaderboardSortKey) => void;
  align?: "left" | "center";
}) {
  const active = activeSortKey === sortKey;

  return (
    <th className={cn("px-2 py-2.5", align === "center" ? "text-center" : "px-3 text-left")}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-slate-700",
          align === "center" && "mx-auto",
          active && "text-slate-700",
        )}
      >
        {label}
        {active ? (
          sortDesc ? (
            <ArrowDown className="h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <ArrowUp className="h-3 w-3 shrink-0" aria-hidden />
          )
        ) : null}
      </button>
    </th>
  );
}

function StatHighlightCard({
  item,
  onClick,
}: {
  item: DiscoveryStatsHighlight;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-w-[160px] flex-1 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 text-left shadow-sm transition hover:border-violet-200 hover:shadow-md"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{item.value}</p>
      {item.hint ? (
        <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 group-hover:text-slate-600">{item.hint}</p>
      ) : null}
    </button>
  );
}

function ClickableCell({
  value,
  onClick,
  className,
}: {
  value: string | number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-1.5 py-0.5 font-semibold tabular-nums text-slate-900 underline-offset-2 hover:bg-violet-50 hover:text-violet-800 hover:underline",
        className,
      )}
    >
      {value}
    </button>
  );
}

function LeaderboardRow({
  row,
  onDrilldown,
  onOpenAd,
}: {
  row: DiscoveryStatsCompetitorRow;
  onDrilldown: (ref: ActiveDrilldown) => void;
  onOpenAd: (adId: string) => void;
}) {
  const competitorHref = row.domain ? buildCompetitorDashboardPath(row.domain) : null;

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <CompetitorLogo
            sources={{ primary: row.logo_url, domain: row.domain }}
            name={row.name}
            size="xs"
            className="h-7 w-7 rounded-md"
          />
          <div className="min-w-0">
            {competitorHref ? (
              <Link
                href={`${competitorHref}?tab=ads%20library`}
                className="text-sm font-semibold text-slate-900 hover:text-violet-700"
              >
                {row.name}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-slate-900">{row.name}</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-2 py-3 text-center">
        <ClickableCell
          value={row.active_ads}
          onClick={() =>
            onDrilldown({
              kind: "competitor_active",
              competitor_id: row.competitor_id,
              title: `${row.name} — active ads`,
            })
          }
        />
      </td>
      <td className="px-2 py-3 text-center">
        <ClickableCell
          value={row.launched_in_period}
          onClick={() =>
            onDrilldown({
              kind: "competitor_launched",
              competitor_id: row.competitor_id,
              title: `${row.name} — launches`,
            })
          }
          className="text-emerald-700"
        />
      </td>
      <td className="px-2 py-3 text-center">
        <ClickableCell
          value={row.killed_in_period}
          onClick={() =>
            onDrilldown({
              kind: "competitor_killed",
              competitor_id: row.competitor_id,
              title: `${row.name} — retirements`,
            })
          }
          className="text-rose-700"
        />
      </td>
      <td className="px-2 py-3 text-center text-sm font-medium tabular-nums text-slate-700">
        {row.net_change >= 0 ? `+${row.net_change}` : row.net_change}
      </td>
      <td className="px-2 py-3 text-center">
        <ClickableCell
          value={row.ultimate_winners}
          onClick={() =>
            onDrilldown({
              kind: "competitor_winners",
              competitor_id: row.competitor_id,
              title: `${row.name} — ultimate winners`,
            })
          }
          className="text-amber-700"
        />
      </td>
      <td className="px-2 py-3 text-center">
        {row.longest_ad_id ? (
          <ClickableCell
            value={`${row.longest_ad_days}d`}
            onClick={() => onOpenAd(row.longest_ad_id!)}
          />
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>
      <td className="px-2 py-3 text-center text-sm tabular-nums text-slate-600">{row.total_days_running}d</td>
    </tr>
  );
}

export function DiscoveryStatsView({
  brandId,
  toolbar,
  onToolbarChange,
  clientBrands,
  activeBrand,
  onOpenAd,
  onNavigateToFeed,
}: Props) {
  const allClientBrandIds = clientBrands.map((b) => b.id);
  const { stats, competitors, loading, error } = useDiscoveryStats(brandId, toolbar, allClientBrandIds);
  const [drilldown, setDrilldown] = useState<ActiveDrilldown | null>(null);
  const [sortKey, setSortKey] = useState<LeaderboardSortKey | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

  const sortedCompetitors = useMemo(() => {
    if (!stats?.competitors.length || !sortKey) return stats?.competitors ?? [];

    return [...stats.competitors].sort((a, b) => {
      if (sortKey === "name") {
        const cmp = a.name.localeCompare(b.name);
        return sortDesc ? -cmp : cmp;
      }

      const av = a[sortKey];
      const bv = b[sortKey];
      const diff = (bv as number) - (av as number);
      return sortDesc ? diff : -diff;
    });
  }, [sortKey, sortDesc, stats?.competitors]);

  const handleSort = (key: LeaderboardSortKey) => {
    if (sortKey === key) {
      setSortDesc((d) => !d);
      return;
    }
    setSortKey(key);
    setSortDesc(true);
  };

  const openHighlight = (item: DiscoveryStatsHighlight) => {
    if (item.drilldown.kind === "single_ad" && item.drilldown.ad_id) {
      onOpenAd(item.drilldown.ad_id);
      return;
    }
    setDrilldown({ ...item.drilldown, title: item.label });
  };

  return (
    <>
      <DiscoveryStatsDateToolbar
        state={toolbar}
        onChange={onToolbarChange}
        rangeLabel={stats?.range.label ?? "Loading…"}
        className="mt-4"
      />

      <div className="mt-4">
        <DiscoveryToolbar
          tab="stats"
          state={toolbar}
          onChange={onToolbarChange}
          competitors={competitors}
          total={stats?.market.total_ads ?? 0}
          activeBrand={activeBrand}
          clientBrands={clientBrands}
        />
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Crunching competitor stats…
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
          {error}
        </div>
      ) : !stats || stats.market.total_ads === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
          <p className="mt-3 text-base font-semibold text-slate-900">No ads in this period</p>
          <p className="mt-1 text-sm text-slate-500">Try a wider date range or track more competitors.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {stats.highlights.map((item: DiscoveryStatsHighlight) => (
              <StatHighlightCard key={item.id} item={item} onClick={() => openHighlight(item)} />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onNavigateToFeed({ ultimateOnly: true, selectedCompetitorIds: toolbar.selectedCompetitorIds }, "ultimate")
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              <Trophy className="h-3.5 w-3.5" />
              View ultimate winners in feed
            </button>
            <button
              type="button"
              onClick={() =>
                onNavigateToFeed(
                  { datePreset: toolbar.datePreset, dateFilterMode: "launched", selectedCompetitorIds: toolbar.selectedCompetitorIds },
                  "whats_new",
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open launches in feed
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Competitor leaderboard</h3>
              <p className="text-xs text-slate-500">Click any number to see the underlying ads</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <SortableHeader
                      label="Brand"
                      sortKey="name"
                      activeSortKey={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Active"
                      sortKey="active_ads"
                      activeSortKey={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                      align="center"
                    />
                    <SortableHeader
                      label="Launched"
                      sortKey="launched_in_period"
                      activeSortKey={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                      align="center"
                    />
                    <SortableHeader
                      label="Killed"
                      sortKey="killed_in_period"
                      activeSortKey={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                      align="center"
                    />
                    <SortableHeader
                      label="Net"
                      sortKey="net_change"
                      activeSortKey={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                      align="center"
                    />
                    <SortableHeader
                      label="Winners"
                      sortKey="ultimate_winners"
                      activeSortKey={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                      align="center"
                    />
                    <SortableHeader
                      label="Longest"
                      sortKey="longest_ad_days"
                      activeSortKey={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                      align="center"
                    />
                    <SortableHeader
                      label="Total runtime"
                      sortKey="total_days_running"
                      activeSortKey={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                      align="center"
                    />
                  </tr>
                </thead>
                <tbody>
                  {sortedCompetitors.map((row: DiscoveryStatsCompetitorRow) => (
                    <LeaderboardRow
                      key={row.competitor_id}
                      row={row}
                      onDrilldown={setDrilldown}
                      onOpenAd={onOpenAd}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {stats.longest_running.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Longest running ads</h3>
                <button
                  type="button"
                  onClick={() => setDrilldown({ kind: "longest_running", title: "Longest running ads" })}
                  className="text-xs font-semibold text-violet-700 hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {stats.longest_running.slice(0, 5).map((ad: DiscoveryStatsLongestAd) => (
                  <button
                    key={ad.ad_id}
                    type="button"
                    onClick={() => onOpenAd(ad.ad_id)}
                    className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-left hover:border-violet-200 hover:bg-violet-50/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {ad.competitor_name}
                        {ad.is_ultimate_winner ? (
                          <Trophy className="ml-1 inline h-3.5 w-3.5 text-amber-600" aria-hidden />
                        ) : null}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">{ad.preview}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-slate-800">{ad.days_running}d</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {drilldown ? (
            <StatsDrilldownPanel
              brandId={brandId}
              toolbar={toolbar}
              allClientBrandIds={allClientBrandIds}
              drilldown={drilldown}
              onOpenAd={onOpenAd}
              onClose={() => setDrilldown(null)}
            />
          ) : null}
        </>
      )}
    </>
  );
}
