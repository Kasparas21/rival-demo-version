"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Calendar,
  Eye,
  Filter,
  Globe,
  Image as ImageIcon,
  Layers,
  Loader2,
  Monitor,
  Search,
  Video,
} from "lucide-react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import { cn } from "@/lib/utils";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";

import { datePresetLabel, platformLabel } from "./timeline-helpers";
import {
  TimelineMenuButton,
  TimelineMenuItem,
  TimelineMenuPanel,
  TimelineToggleRow,
  useMenuState,
} from "./timeline-menu";
import type {
  TimelineDatePreset,
  TimelineFormatFilter,
  TimelineSort,
  TimelineStatusFilter,
  TimelineViewFields,
} from "./timeline-types";

type PlatformChip = { id: string; label: string; count: number };

export type TimelineToolbarState = {
  search: string;
  datePreset: TimelineDatePreset;
  customRangeStart: number | null;
  customRangeEnd: number | null;
  sort: TimelineSort;
  statusFilter: TimelineStatusFilter;
  formatFilter: TimelineFormatFilter;
  selectedPlatforms: Set<string>;
  groupDuplicates: boolean;
  showBrandBids: boolean;
  viewFields: TimelineViewFields;
};

type Props = {
  platforms: PlatformChip[];
  state: TimelineToolbarState;
  onChange: (patch: Partial<TimelineToolbarState>) => void;
  dateRangeEarliest: number | null;
  dateRangeLatest: number | null;
  hiddenBrandBidCount: number;
  showMetaSortOptions?: boolean;
};

const DATE_PRESETS: TimelineDatePreset[] = ["7d", "14d", "30d", "90d", "365d", "all"];

const BASE_SORT_OPTIONS: { id: TimelineSort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "longest_running", label: "Longest running" },
];

const META_SORT_OPTIONS: { id: TimelineSort; label: string }[] = [
  { id: "impressions", label: "Impressions (high → low)" },
  { id: "ultimate_winner", label: "Ultimate winner" },
];

function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toDateInputValue(ms: number | null): string {
  if (ms == null) return "";
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromDateInputValue(value: string): number | null {
  if (!value) return null;
  const t = Date.parse(`${value}T12:00:00`);
  return Number.isFinite(t) ? t : null;
}

export function TimelineToolbar({
  platforms,
  state,
  onChange,
  dateRangeEarliest,
  dateRangeLatest,
  hiddenBrandBidCount,
  showMetaSortOptions = false,
}: Props) {
  const menu = useMenuState();
  const [filterPane, setFilterPane] = useState<"root" | "platform" | "status" | "format">("root");
  const [draftStart, setDraftStart] = useState(toDateInputValue(state.customRangeStart));
  const [draftEnd, setDraftEnd] = useState(toDateInputValue(state.customRangeEnd));

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (state.statusFilter !== "all") n += 1;
    if (state.formatFilter !== "all") n += 1;
    if (state.selectedPlatforms.size > 0 && state.selectedPlatforms.size < platforms.length) n += 1;
    if (!state.showBrandBids && hiddenBrandBidCount > 0) n += 1;
    return n;
  }, [state, platforms.length, hiddenBrandBidCount]);

  const dateButtonLabel =
    state.datePreset === "custom" && state.customRangeStart != null && state.customRangeEnd != null
      ? `${formatShortDate(state.customRangeStart)} – ${formatShortDate(state.customRangeEnd)}`
      : datePresetLabel(state.datePreset);

  const sortOptions = useMemo(
    () => (showMetaSortOptions ? [...BASE_SORT_OPTIONS, ...META_SORT_OPTIONS] : BASE_SORT_OPTIONS),
    [showMetaSortOptions],
  );

  const sortLabel = sortOptions.find((o) => o.id === state.sort)?.label ?? "Newest";

  const togglePlatform = (id: string) => {
    const next = new Set(state.selectedPlatforms);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ selectedPlatforms: next });
  };

  const openFilterMenu = () => {
    setFilterPane("root");
    menu.toggle("filter");
  };

  const applyCustomRange = () => {
    const start = fromDateInputValue(draftStart);
    const end = fromDateInputValue(draftEnd);
    if (start == null || end == null) return;
    onChange({ datePreset: "custom", customRangeStart: start, customRangeEnd: end });
    menu.close();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={state.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search ads…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-1.5 pl-8 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />

        <div className="relative">
          <TimelineMenuButton
            label={
              <span className="inline-flex items-center gap-1.5">
                Add filter
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-slate-900 px-1.5 py-0 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </span>
            }
            icon={<Filter className="h-3.5 w-3.5 text-slate-500" />}
            active={menu.isOpen("filter")}
            onClick={openFilterMenu}
          />
          <TimelineMenuPanel open={menu.isOpen("filter")} onClose={menu.close} className="w-56">
            {filterPane === "root" ? (
              <>
                <TimelineMenuItem
                  label="Platform"
                  icon={<Monitor className="h-4 w-4" />}
                  onClick={() => setFilterPane("platform")}
                  trailing={<span className="text-slate-400">›</span>}
                />
                <TimelineMenuItem
                  label="Status"
                  icon={<Loader2 className="h-4 w-4" />}
                  onClick={() => setFilterPane("status")}
                  trailing={<span className="text-slate-400">›</span>}
                />
                <TimelineMenuItem
                  label="Format"
                  icon={<Video className="h-4 w-4" />}
                  onClick={() => setFilterPane("format")}
                  trailing={<span className="text-slate-400">›</span>}
                />
                <div className="border-t border-slate-100">
                  <TimelineToggleRow
                    label="Show brand bids"
                    checked={state.showBrandBids}
                    onChange={(showBrandBids) => onChange({ showBrandBids })}
                  />
                </div>
              </>
            ) : null}

            {filterPane === "platform" ? (
              <>
                <button
                  type="button"
                  className="w-full border-b border-slate-100 px-3 py-2 text-left text-[11px] font-semibold text-slate-500"
                  onClick={() => setFilterPane("root")}
                >
                  ← Platform
                </button>
                {platforms.map((p) => (
                  <TimelineMenuItem
                    key={p.id}
                    label={
                      <span className="inline-flex items-center gap-2">
                        <ComparisonPlatformIcon platform={p.id as StrategyPlatform} className="h-3.5 w-3.5" />
                        {p.label}
                        <span className="text-slate-400">({p.count})</span>
                      </span>
                    }
                    selected={state.selectedPlatforms.has(p.id)}
                    onClick={() => togglePlatform(p.id)}
                  />
                ))}
              </>
            ) : null}

            {filterPane === "status" ? (
              <>
                <button
                  type="button"
                  className="w-full border-b border-slate-100 px-3 py-2 text-left text-[11px] font-semibold text-slate-500"
                  onClick={() => setFilterPane("root")}
                >
                  ← Status
                </button>
                {(
                  [
                    { id: "all", label: "All statuses" },
                    { id: "active", label: "Active" },
                    { id: "retired", label: "Retired" },
                  ] as const
                ).map((opt) => (
                  <TimelineMenuItem
                    key={opt.id}
                    label={opt.label}
                    selected={state.statusFilter === opt.id}
                    onClick={() => {
                      onChange({ statusFilter: opt.id });
                      menu.close();
                    }}
                  />
                ))}
              </>
            ) : null}

            {filterPane === "format" ? (
              <>
                <button
                  type="button"
                  className="w-full border-b border-slate-100 px-3 py-2 text-left text-[11px] font-semibold text-slate-500"
                  onClick={() => setFilterPane("root")}
                >
                  ← Format
                </button>
                {(
                  [
                    { id: "all", label: "All formats", icon: <Globe className="h-4 w-4" /> },
                    { id: "video", label: "Video", icon: <Video className="h-4 w-4" /> },
                    { id: "image", label: "Image", icon: <ImageIcon className="h-4 w-4" /> },
                  ] as const
                ).map((opt) => (
                  <TimelineMenuItem
                    key={opt.id}
                    label={opt.label}
                    icon={opt.icon}
                    selected={state.formatFilter === opt.id}
                    onClick={() => {
                      onChange({ formatFilter: opt.id });
                      menu.close();
                    }}
                  />
                ))}
              </>
            ) : null}
          </TimelineMenuPanel>
        </div>

        <div className="relative">
          <TimelineMenuButton
            label={dateButtonLabel}
            icon={<Calendar className="h-3.5 w-3.5 text-slate-500" />}
            active={menu.isOpen("date")}
            onClick={() => menu.toggle("date")}
          />
          <TimelineMenuPanel open={menu.isOpen("date")} onClose={menu.close} className="w-[min(92vw,420px)]">
            <div className="flex">
              <div className="w-36 shrink-0 border-r border-slate-100 py-1">
                {DATE_PRESETS.map((preset) => (
                  <TimelineMenuItem
                    key={preset}
                    label={datePresetLabel(preset)}
                    selected={state.datePreset === preset}
                    onClick={() => {
                      onChange({ datePreset: preset });
                      menu.close();
                    }}
                  />
                ))}
                <TimelineMenuItem
                  label="Custom range"
                  selected={state.datePreset === "custom"}
                  onClick={() => onChange({ datePreset: "custom" })}
                />
              </div>
              <div className="min-w-0 flex-1 p-3">
                <p className="mb-2 text-[12px] font-semibold text-slate-900">Custom range</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[11px] text-slate-500">
                    From
                    <input
                      type="date"
                      value={draftStart}
                      min={dateRangeEarliest != null ? toDateInputValue(dateRangeEarliest) : undefined}
                      max={dateRangeLatest != null ? toDateInputValue(dateRangeLatest) : undefined}
                      onChange={(e) => setDraftStart(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
                    />
                  </label>
                  <label className="block text-[11px] text-slate-500">
                    To
                    <input
                      type="date"
                      value={draftEnd}
                      min={dateRangeEarliest != null ? toDateInputValue(dateRangeEarliest) : undefined}
                      max={dateRangeLatest != null ? toDateInputValue(dateRangeLatest) : undefined}
                      onChange={(e) => setDraftEnd(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
                    />
                  </label>
                </div>
                <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
                  Only show ads that were live between these dates.
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                    onClick={menu.close}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!draftStart || !draftEnd}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[12px] font-semibold",
                      draftStart && draftEnd
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "cursor-not-allowed bg-slate-100 text-slate-400",
                    )}
                    onClick={applyCustomRange}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </TimelineMenuPanel>
        </div>

        <div className="relative">
          <TimelineMenuButton
            label={sortLabel}
            icon={<ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />}
            active={menu.isOpen("sort")}
            onClick={() => menu.toggle("sort")}
          />
          <TimelineMenuPanel open={menu.isOpen("sort")} onClose={menu.close} className="w-44">
            {sortOptions.map((opt) => (
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

        <div className="relative">
          <TimelineMenuButton
            label={state.groupDuplicates ? "On" : "Off"}
            icon={<Layers className="h-3.5 w-3.5 text-slate-500" />}
            active={menu.isOpen("group") || state.groupDuplicates}
            onClick={() => menu.toggle("group")}
          />
          <TimelineMenuPanel open={menu.isOpen("group")} onClose={menu.close} className="w-72">
            <TimelineToggleRow
              label="Group duplicates"
              description="Group together Meta ads that use the same image or video."
              checked={state.groupDuplicates}
              onChange={(groupDuplicates) => onChange({ groupDuplicates })}
            />
          </TimelineMenuPanel>
        </div>

        <div className="relative">
          <TimelineMenuButton
            label="View"
            icon={<Eye className="h-3.5 w-3.5 text-slate-500" />}
            active={menu.isOpen("view")}
            onClick={() => menu.toggle("view")}
          />
          <TimelineMenuPanel open={menu.isOpen("view")} onClose={menu.close} className="w-56" align="right">
            <TimelineToggleRow
              label="Brand details"
              checked={state.viewFields.brandDetails}
              onChange={(brandDetails) =>
                onChange({ viewFields: { ...state.viewFields, brandDetails } })
              }
            />
            <TimelineToggleRow
              label="Ad copy"
              checked={state.viewFields.adCopy}
              onChange={(adCopy) => onChange({ viewFields: { ...state.viewFields, adCopy } })}
            />
            <TimelineToggleRow
              label="Headline & CTA"
              checked={state.viewFields.headlineCta}
              onChange={(headlineCta) =>
                onChange({ viewFields: { ...state.viewFields, headlineCta } })
              }
            />
          </TimelineMenuPanel>
        </div>
      </div>

      {!state.showBrandBids && hiddenBrandBidCount > 0 ? (
        <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-500">
          {hiddenBrandBidCount} brand-bid ads hidden · enable in Add filter
        </p>
      ) : null}

      {state.selectedPlatforms.size > 0 && state.selectedPlatforms.size < platforms.length ? (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
          <span className="text-[11px] font-medium text-slate-500">Platforms:</span>
          {[...state.selectedPlatforms].map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
            >
              <ComparisonPlatformIcon platform={id as StrategyPlatform} className="h-3 w-3" />
              {platformLabel(id)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
