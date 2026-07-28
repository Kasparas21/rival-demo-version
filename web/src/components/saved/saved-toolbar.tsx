"use client";

import { useMemo } from "react";
import {
  ArrowUpDown,
  Calendar,
  Filter,
  Globe,
  Image as ImageIcon,
  Layers,
  Mail,
  Search,
  Share2,
  Video,
} from "lucide-react";
import {
  TimelineMenuButton,
  TimelineMenuItem,
  TimelineMenuPanel,
  TimelineToggleRow,
  useMenuState,
} from "@/components/competitor/tests-timeline/timeline-menu";
import type { SavedCompetitorChip, SavedTypeCounts } from "@/lib/saved/types";
import { ALL_COMPARISON_PLATFORMS } from "@/lib/platforms/comparison-platform-order";
import { platformLabel } from "@/lib/platforms/platform-label";
import { cn } from "@/lib/utils";

import type { SavedToolbarState } from "./saved-types";

const SORT_OPTIONS: { id: SavedToolbarState["sort"]; label: string }[] = [
  { id: "newest", label: "Newest saved" },
  { id: "oldest", label: "Oldest saved" },
];

const DATE_OPTIONS: { id: SavedToolbarState["datePreset"]; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

type Props = {
  state: SavedToolbarState;
  onChange: (patch: Partial<SavedToolbarState>) => void;
  competitors: SavedCompetitorChip[];
  typeCounts: SavedTypeCounts;
  platformCounts: Record<string, number>;
  total: number;
};

export function savedTabClass(active: boolean) {
  return cn(
    "rounded-full px-4 py-2 text-sm font-semibold transition",
    active
      ? "bg-[color:var(--rival-primary)] text-white shadow-sm"
      : "bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900",
  );
}

export function SavedToolbar({
  state,
  onChange,
  competitors,
  typeCounts,
  platformCounts,
  total,
}: Props) {
  const menu = useMenuState();

  const sortLabel = SORT_OPTIONS.find((o) => o.id === state.sort)?.label ?? "Newest saved";
  const dateLabel = DATE_OPTIONS.find((o) => o.id === state.datePreset)?.label ?? "All time";

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (state.format !== "all") n += 1;
    if (state.selectedPlatforms.size > 0) n += 1;
    if (state.competitorId) n += 1;
    if (state.datePreset !== "all") n += 1;
    return n;
  }, [state]);

  const togglePlatform = (id: string) => {
    const next = new Set(state.selectedPlatforms);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ selectedPlatforms: next });
  };

  const showPlatformFilter =
    state.itemType === "all" || state.itemType === "ad" || state.itemType === "organic";

  return (
    <div className="sticky top-0 z-20 -mx-1 rounded-2xl border border-slate-200/80 bg-white/85 px-3 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:px-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={state.search}
              onChange={(e) => onChange({ search: e.target.value })}
              placeholder="Search saved ads, emails, posts, pages…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none ring-[color:var(--rival-accent-blue)]/30 transition focus:border-[color:var(--rival-accent-blue)] focus:ring-2"
            />
          </div>
          <span className="hidden text-xs font-medium tabular-nums text-slate-500 sm:inline">
            {total.toLocaleString()} items
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <TimelineMenuButton
              label={activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
              icon={<Filter className="h-3.5 w-3.5 text-slate-500" aria-hidden />}
              active={menu.isOpen("filters")}
              onClick={() => menu.toggle("filters")}
            />
            <TimelineMenuPanel open={menu.isOpen("filters")} onClose={menu.close} className="min-w-[240px] py-1">
              {showPlatformFilter ? (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Platform
                  </p>
                  {ALL_COMPARISON_PLATFORMS.filter((p) => (platformCounts[p] ?? 0) > 0).map((p) => (
                    <TimelineToggleRow
                      key={p}
                      label={`${platformLabel(p)} (${platformCounts[p] ?? 0})`}
                      checked={state.selectedPlatforms.has(p)}
                      onChange={() => togglePlatform(p)}
                    />
                  ))}
                  <div className="my-1 h-px bg-slate-100" />
                </>
              ) : null}
              {(state.itemType === "all" || state.itemType === "ad") && (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Ad format
                  </p>
                  <TimelineMenuItem
                    label="All formats"
                    icon={<Layers className="h-3.5 w-3.5" />}
                    selected={state.format === "all"}
                    onClick={() => onChange({ format: "all" })}
                  />
                  <TimelineMenuItem
                    label="Video"
                    icon={<Video className="h-3.5 w-3.5" />}
                    selected={state.format === "video"}
                    onClick={() => onChange({ format: "video" })}
                  />
                  <TimelineMenuItem
                    label="Image"
                    icon={<ImageIcon className="h-3.5 w-3.5" />}
                    selected={state.format === "image"}
                    onClick={() => onChange({ format: "image" })}
                  />
                  <div className="my-1 h-px bg-slate-100" />
                </>
              )}
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Saved date
              </p>
              {DATE_OPTIONS.map((opt) => (
                <TimelineMenuItem
                  key={opt.id}
                  label={opt.label}
                  selected={state.datePreset === opt.id}
                  onClick={() => onChange({ datePreset: opt.id })}
                />
              ))}
            </TimelineMenuPanel>
          </div>

          <div className="relative">
            <TimelineMenuButton
              label={dateLabel}
              icon={<Calendar className="h-3.5 w-3.5 text-slate-500" aria-hidden />}
              active={menu.isOpen("date")}
              onClick={() => menu.toggle("date")}
            />
            <TimelineMenuPanel open={menu.isOpen("date")} onClose={menu.close} className="min-w-[168px] py-1">
              {DATE_OPTIONS.map((opt) => (
                <TimelineMenuItem
                  key={opt.id}
                  label={opt.label}
                  selected={state.datePreset === opt.id}
                  onClick={() => {
                    onChange({ datePreset: opt.id });
                    menu.close();
                  }}
                />
              ))}
            </TimelineMenuPanel>
          </div>

          <div className="relative">
            <TimelineMenuButton
              label={sortLabel}
              icon={<ArrowUpDown className="h-3.5 w-3.5 text-slate-500" aria-hidden />}
              active={menu.isOpen("sort")}
              onClick={() => menu.toggle("sort")}
            />
            <TimelineMenuPanel open={menu.isOpen("sort")} onClose={menu.close} className="min-w-[200px] py-1">
              {SORT_OPTIONS.map((opt) => (
                <TimelineMenuItem
                  key={opt.id}
                  label={opt.label}
                  selected={state.sort === opt.id}
                  onClick={() => {
                    onChange({ sort: opt.id });
                    menu.close();
                  }}
                />
              ))}
            </TimelineMenuPanel>
          </div>

          {competitors.length > 0 ? (
            <div className="relative">
              <TimelineMenuButton
                label={
                  state.competitorId
                    ? competitors.find((c) => c.id === state.competitorId)?.name ?? "Competitor"
                    : "All competitors"
                }
                icon={<Layers className="h-3.5 w-3.5 text-slate-500" aria-hidden />}
                active={menu.isOpen("brand")}
                onClick={() => menu.toggle("brand")}
              />
              <TimelineMenuPanel open={menu.isOpen("brand")} onClose={menu.close} className="min-w-[220px] py-1">
                <TimelineMenuItem
                  label="All competitors"
                  selected={!state.competitorId}
                  onClick={() => {
                    onChange({ competitorId: null });
                    menu.close();
                  }}
                />
                {competitors.map((c) => (
                  <TimelineMenuItem
                    key={c.id}
                    label={`${c.name} (${c.item_count})`}
                    selected={state.competitorId === c.id}
                    onClick={() => {
                      onChange({ competitorId: c.id });
                      menu.close();
                    }}
                  />
                ))}
              </TimelineMenuPanel>
            </div>
          ) : null}
        </div>

        {state.selectedPlatforms.size > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {[...state.selectedPlatforms].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white"
              >
                {platformLabel(p)}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const SAVED_TAB_META = [
  { id: "all" as const, label: "All", countKey: "total" as const, icon: Layers },
  { id: "ad" as const, label: "Ads", countKey: "ads" as const, icon: ImageIcon },
  { id: "email" as const, label: "Emails", countKey: "emails" as const, icon: Mail },
  { id: "organic" as const, label: "Organic", countKey: "organic" as const, icon: Share2 },
  { id: "landing" as const, label: "Landings", countKey: "landings" as const, icon: Globe },
];
