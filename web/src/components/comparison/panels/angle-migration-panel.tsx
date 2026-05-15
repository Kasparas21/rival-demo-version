"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import type {
  AnglesByPlatformInsight,
  CompetitorStrategyOverviewPayload,
  StrategyPlatform,
} from "@/lib/strategy-overview/payload-types";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { ComparisonInsufficient } from "@/components/comparison/panel-shell";
import { parseAngleForDisplay } from "@/lib/comparison/stealable-angle-present";
import { cn } from "@/lib/utils";

type Props = {
  workspace: { name: string; payload: CompetitorStrategyOverviewPayload | null };
  competitor: { name: string; payload: CompetitorStrategyOverviewPayload | null };
  competitorId: string;
  onOpenAd: (adId: string) => void;
};

type Tag = "Shared" | "Theirs only" | "Yours only";
type TagFilter = "All" | Tag;

function detailForAngle(payload: CompetitorStrategyOverviewPayload | null, angle: string): AnglesByPlatformInsight | undefined {
  return (payload?.insights?.angles_by_platform ?? []).find((x) => x.angle === angle);
}

type VaultAd = {
  id: string;
  platform: string;
  ad_creative_url: string | null;
  ad_text: string;
};

function tagDotClass(tag: Tag): string {
  if (tag === "Theirs only") return "bg-amber-400";
  if (tag === "Yours only") return "bg-emerald-500";
  return "bg-sky-500";
}

export function AngleMigrationPanel({ workspace, competitor, competitorId, onOpenAd }: Props) {
  const reduce = useReducedMotion() ?? false;

  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<TagFilter>("All");
  const [drawerAngle, setDrawerAngle] = useState<string | null>(null);
  const [drawerAds, setDrawerAds] = useState<VaultAd[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const rows = useMemo(() => {
    const wAngles = new Set((workspace.payload?.insights?.angles_by_platform ?? []).map((x) => x.angle));
    const cAngles = new Set((competitor.payload?.insights?.angles_by_platform ?? []).map((x) => x.angle));
    const u = new Set<string>([...wAngles, ...cAngles]);
    return [...u].map((angle) => {
      const inW = wAngles.has(angle);
      const inC = cAngles.has(angle);
      let tag: Tag;
      if (inW && inC) tag = "Shared";
      else if (inC && !inW) tag = "Theirs only";
      else tag = "Yours only";
      const wDetail = detailForAngle(workspace.payload, angle);
      const cDetail = detailForAngle(competitor.payload, angle);
      return { angle, tag, wDetail, cDetail };
    });
  }, [workspace.payload, competitor.payload]);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const maxA = Math.max(a.wDetail?.totalCount ?? 0, a.cDetail?.totalCount ?? 0);
        const maxB = Math.max(b.wDetail?.totalCount ?? 0, b.cDetail?.totalCount ?? 0);
        return maxB - maxA;
      }),
    [rows]
  );

  const counts = useMemo(() => {
    return {
      all: sorted.length,
      theirs: sorted.filter((r) => r.tag === "Theirs only").length,
      yours: sorted.filter((r) => r.tag === "Yours only").length,
      shared: sorted.filter((r) => r.tag === "Shared").length,
    };
  }, [sorted]);

  const filtered = useMemo(() => {
    if (filter === "All") return sorted;
    return sorted.filter((r) => r.tag === filter);
  }, [sorted, filter]);

  const visible = expanded ? filtered : filtered.slice(0, 5);

  const openDrawer = useCallback(
    async (angle: string) => {
      setDrawerAngle(angle);
      setDrawerLoading(true);
      setDrawerAds([]);
      const res = await fetch(
        `/api/comparison/vault-ads?competitorId=${encodeURIComponent(competitorId)}&angle=${encodeURIComponent(angle)}`,
        { credentials: "include" }
      );
      const json = (await res.json()) as { ok?: boolean; ads?: VaultAd[] };
      setDrawerAds(json.ads ?? []);
      setDrawerLoading(false);
    },
    [competitorId]
  );

  const formatAds = (tag: Tag, wDetail?: AnglesByPlatformInsight, cDetail?: AnglesByPlatformInsight) => {
    if (tag === "Shared") {
      return `${wDetail?.totalCount ?? "—"} / ${cDetail?.totalCount ?? "—"}`;
    }
    if (tag === "Theirs only") return String(cDetail?.totalCount ?? "—");
    return String(wDetail?.totalCount ?? "—");
  };

  const formatPlat = (tag: Tag, wDetail?: AnglesByPlatformInsight, cDetail?: AnglesByPlatformInsight) => {
    const pick = tag === "Theirs only" ? cDetail : tag === "Yours only" ? wDetail : cDetail ?? wDetail;
    const plats = pick?.platforms ?? [];
    if (plats.length === 0) return <span className="text-slate-400">—</span>;
    return (
      <div className="flex gap-0.5">
        {plats.slice(0, 3).map((pl) => (
          <ComparisonPlatformIcon key={pl} platform={pl as StrategyPlatform} className="h-4 w-4" />
        ))}
      </div>
    );
  };

  const formatLife = (tag: Tag, wDetail?: AnglesByPlatformInsight, cDetail?: AnglesByPlatformInsight) => {
    if (tag === "Shared") return `${wDetail?.avgLifespanDays ?? "—"} / ${cDetail?.avgLifespanDays ?? "—"}`;
    if (tag === "Theirs only") return String(cDetail?.avgLifespanDays ?? "—");
    return String(wDetail?.avgLifespanDays ?? "—");
  };

  const chip = (id: TagFilter, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setFilter(id)}
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition",
        filter === id ? "bg-[var(--rival-primary,#343434)] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      )}
    >
      {label} ({count})
    </button>
  );

  if (sorted.length === 0) {
    return (
      <div
        id="comparison-angles"
        className="relative mb-12 scroll-mt-36 pt-8 pb-2"
      >
        <div
          className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
          aria-hidden
        />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Full angle breakdown</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">Reference library</h3>
        <div className="mt-4">
          <ComparisonInsufficient message="No angle rollups yet — enrich ads and recompute strategy overview." />
        </div>
      </div>
    );
  }

  return (
    <div
      id="comparison-angles"
      className="relative mb-12 scroll-mt-36 pt-8 pb-2"
    >
      <div
        className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
        aria-hidden
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Full angle breakdown</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Every detected angle · {sorted.length} total</h3>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          {expanded ? "Collapse" : "Expand"}
          <ChevronDown className={cn("h-4 w-4 transition", expanded ? "rotate-180" : "")} />
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {chip("All", "All", counts.all)}
          {chip("Theirs only", "Theirs only", counts.theirs)}
          {chip("Yours only", "Yours only", counts.yours)}
          {chip("Shared", "Shared", counts.shared)}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[640px] w-full border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-2"> </th>
              <th className="py-2 pr-3">Angle</th>
              <th className="px-1 py-2">Ads</th>
              <th className="px-1 py-2">Plat</th>
              <th className="px-1 py-2">Life</th>
              <th className="py-2 pl-1">Tag</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ angle, tag, wDetail, cDetail }) => {
              const { hook, rawHead } = parseAngleForDisplay(angle);
              return (
                <tr
                  key={angle}
                  className="cursor-pointer border-b border-slate-100 align-top hover:bg-slate-50"
                  onClick={() => void openDrawer(angle)}
                >
                  <td className="py-2 pr-2">
                    <span className={`inline-block size-2.5 rounded-full ${tagDotClass(tag)}`} title={tag} />
                  </td>
                  <td className="max-w-[320px] py-2 pr-3">
                    <p className="font-semibold text-slate-900 line-clamp-2">{rawHead}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{hook}</p>
                  </td>
                  <td className="px-1 py-2 tabular-nums text-slate-700">{formatAds(tag, wDetail, cDetail)}</td>
                  <td className="px-1 py-2 text-slate-600">{formatPlat(tag, wDetail, cDetail)}</td>
                  <td className="px-1 py-2 tabular-nums text-slate-600">{formatLife(tag, wDetail, cDetail)}</td>
                  <td className="py-2 pl-1 text-[11px] font-medium text-slate-500">{tag}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!expanded && filtered.length > 5 ? (
        <p className="mt-3 text-xs text-slate-500">Showing 5 of {filtered.length}. Expand to browse filters and full list.</p>
      ) : null}

      {drawerAngle ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/35" role="presentation" onClick={() => setDrawerAngle(null)}>
          <motion.div
            initial={reduce ? false : { x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900 line-clamp-2">{drawerAngle}</p>
              <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-slate-100" onClick={() => setDrawerAngle(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {drawerLoading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {drawerAds.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        onOpenAd(a.id);
                        setDrawerAngle(null);
                      }}
                      className="relative aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                    >
                      {a.ad_creative_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.ad_creative_url} alt="" className="size-full object-cover" loading="lazy" />
                      ) : (
                        <span className="p-1 text-[9px] text-slate-600">{a.ad_text.slice(0, 48)}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
