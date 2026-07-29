"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Calendar,
  Eye,
  Filter,
  Globe,
  Image as ImageIcon,
  Layers,
  Video,
} from "lucide-react";

import {
  datePresetLabel,
} from "@/components/competitor/tests-timeline/timeline-helpers";
import {
  TimelineMenuButton,
  TimelineMenuItem,
  TimelineMenuPanel,
  TimelineToggleRow,
  useMenuState,
} from "@/components/competitor/tests-timeline/timeline-menu";
import type { PlatformAdsDatePreset } from "@/lib/ad-library/platform-ads-page";
import type { AdsLibraryPlatform } from "@/lib/ad-library/ads-library-platform";
import { cn } from "@/lib/utils";

import type { PlatformAdsToolbarState } from "@/components/ads-library/platform-ads-modal-types";

const DATE_PRESETS: PlatformAdsDatePreset[] = ["7d", "14d", "30d", "90d", "365d", "all"];

const BASE_SORT_OPTIONS: { id: PlatformAdsToolbarState["sort"]; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "longest_running", label: "Longest running" },
];

const META_SORT_OPTIONS: { id: PlatformAdsToolbarState["sort"]; label: string }[] = [
  { id: "impressions", label: "Impressions (high → low)" },
  { id: "ultimate_winner", label: "Ultimate winner" },
];

function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toDateInputValue(ms: number | null): string {
  if (ms == null) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromDateInputValue(value: string): number | null {
  if (!value) return null;
  const t = Date.parse(`${value}T12:00:00`);
  return Number.isFinite(t) ? t : null;
}

type Props = {
  platform: AdsLibraryPlatform;
  state: PlatformAdsToolbarState;
  onChange: (patch: Partial<PlatformAdsToolbarState>) => void;
  dateRangeEarliest: number | null;
  dateRangeLatest: number | null;
  glass?: boolean;
};

export function PlatformAdsModalToolbar({
  platform,
  state,
  onChange,
  dateRangeEarliest,
  dateRangeLatest,
  glass = false,
}: Props) {
  const menu = useMenuState();
  const [filterPane, setFilterPane] = useState<"root" | "status" | "format">("root");
  const [draftStart, setDraftStart] = useState(toDateInputValue(state.customRangeStart));
  const [draftEnd, setDraftEnd] = useState(toDateInputValue(state.customRangeEnd));

  useEffect(() => {
    setDraftStart(toDateInputValue(state.customRangeStart));
    setDraftEnd(toDateInputValue(state.customRangeEnd));
  }, [state.customRangeStart, state.customRangeEnd]);

  const dateButtonLabel =
    state.datePreset === "custom" && state.customRangeStart != null && state.customRangeEnd != null
      ? `${formatShortDate(state.customRangeStart)} – ${formatShortDate(state.customRangeEnd)}`
      : datePresetLabel(state.datePreset);

  const sortOptions = useMemo(
    () => (platform === "meta" ? [...BASE_SORT_OPTIONS, ...META_SORT_OPTIONS] : BASE_SORT_OPTIONS),
    [platform],
  );

  const sortLabel = sortOptions.find((o) => o.id === state.sort)?.label ?? "Newest";

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (state.statusFilter !== "all") n += 1;
    if (state.formatFilter !== "all") n += 1;
    if (state.ultimateOnly) n += 1;
    if (state.impressionsOnly) n += 1;
    return n;
  }, [state]);

  const openFilterMenu = useCallback(() => {
    setFilterPane("root");
    menu.toggle("filter");
  }, [menu]);

  const applyCustomRange = useCallback(() => {
    const start = fromDateInputValue(draftStart);
    const end = fromDateInputValue(draftEnd);
    if (start == null || end == null) return;
    onChange({ datePreset: "custom", customRangeStart: start, customRangeEnd: end });
    menu.close();
  }, [draftStart, draftEnd, menu, onChange]);

  const showGroupDuplicates = platform === "meta";
  const showMetaAdvancedFilters = platform === "meta";

  return (
    <div
      className={cn(
        "relative flex flex-wrap items-center gap-2 border-b px-4 py-2.5 sm:px-6",
        glass
          ? "border-white/40 bg-white/55 backdrop-blur-xl backdrop-saturate-[1.35] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
          : "border-gray-100 bg-[#fafafa]/90",
      )}
    >
      <div className="relative">
        <TimelineMenuButton
          label={activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
          icon={<Filter className="h-3.5 w-3.5 text-slate-500" aria-hidden />}
          active={menu.isOpen("filter") || activeFilterCount > 0}
          onClick={openFilterMenu}
        />
        <TimelineMenuPanel open={menu.isOpen("filter")} onClose={menu.close} className="w-56">
          {filterPane === "root" ? (
            <>
              <TimelineMenuItem
                label="Status"
                icon={<Filter className="h-4 w-4" />}
                onClick={() => setFilterPane("status")}
                trailing={<span className="text-slate-400">›</span>}
              />
              <TimelineMenuItem
                label="Format"
                icon={<Video className="h-4 w-4" />}
                onClick={() => setFilterPane("format")}
                trailing={<span className="text-slate-400">›</span>}
              />
              {showMetaAdvancedFilters ? (
                <div className="border-t border-slate-100">
                  <TimelineToggleRow
                    label="Ultimate winners only"
                    description="High Meta impression band plus 30+ days live."
                    checked={state.ultimateOnly}
                    onChange={(ultimateOnly) => onChange({ ultimateOnly })}
                  />
                  <TimelineToggleRow
                    label="Has impression data"
                    description="Meta ads with a reported impression band."
                    checked={state.impressionsOnly}
                    onChange={(impressionsOnly) => onChange({ impressionsOnly })}
                  />
                </div>
              ) : null}
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
                  { id: "retired", label: "Inactive" },
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
          icon={<Calendar className="h-3.5 w-3.5 text-slate-500" aria-hidden />}
          active={menu.isOpen("date")}
          onClick={() => menu.toggle("date")}
        />
        <TimelineMenuPanel open={menu.isOpen("date")} onClose={menu.close} className="w-[min(92vw,340px)] p-0">
          <div className="flex min-h-[280px]">
            <div className="w-[148px] shrink-0 border-r border-slate-100 py-1">
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
              {state.datePreset === "custom" ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Start</label>
                    <input
                      type="date"
                      value={draftStart}
                      min={dateRangeEarliest != null ? toDateInputValue(dateRangeEarliest) : undefined}
                      max={dateRangeLatest != null ? toDateInputValue(dateRangeLatest) : undefined}
                      onChange={(e) => setDraftStart(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">End</label>
                    <input
                      type="date"
                      value={draftEnd}
                      min={dateRangeEarliest != null ? toDateInputValue(dateRangeEarliest) : undefined}
                      max={dateRangeLatest != null ? toDateInputValue(dateRangeLatest) : undefined}
                      onChange={(e) => setDraftEnd(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px]"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-slate-500 pt-1">Quick presets filter ads by when they were live.</p>
              )}
            </div>
          </div>
          <div className="border-t border-sky-100 bg-sky-50/80 px-3 py-2 text-[11px] text-sky-900/80">
            Only show ads that were live between these dates.
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-3 py-2.5">
            <button type="button" className="text-[12px] font-medium text-slate-600" onClick={menu.close}>
              Cancel
            </button>
            <button
              type="button"
              disabled={state.datePreset !== "custom" || !draftStart || !draftEnd}
              onClick={applyCustomRange}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </TimelineMenuPanel>
      </div>

      <div className="relative">
        <TimelineMenuButton
          label={sortLabel}
          icon={<ArrowUpDown className="h-3.5 w-3.5 text-slate-500" aria-hidden />}
          active={menu.isOpen("sort")}
          onClick={() => menu.toggle("sort")}
        />
        <TimelineMenuPanel open={menu.isOpen("sort")} onClose={menu.close} className="min-w-[168px] py-1">
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

      {showGroupDuplicates ? (
        <div className="relative">
          <TimelineMenuButton
            label={state.groupDuplicates ? "On" : "Off"}
            icon={<Layers className="h-3.5 w-3.5 text-slate-500" aria-hidden />}
            active={menu.isOpen("group") || state.groupDuplicates}
            onClick={() => menu.toggle("group")}
          />
          <TimelineMenuPanel open={menu.isOpen("group")} onClose={menu.close} className="w-[min(92vw,300px)] p-3">
            <TimelineToggleRow
              label="Group duplicates"
              description="Group together Meta ads that use the same image or video."
              checked={state.groupDuplicates}
              onChange={(groupDuplicates) => onChange({ groupDuplicates })}
            />
          </TimelineMenuPanel>
        </div>
      ) : null}

      <div className="relative ml-auto">
        <TimelineMenuButton
          label=""
          icon={<Eye className="h-3.5 w-3.5 text-slate-500" aria-hidden />}
          active={menu.isOpen("view")}
          onClick={() => menu.toggle("view")}
          className="min-w-[36px] justify-center px-2"
        />
        <TimelineMenuPanel open={menu.isOpen("view")} onClose={menu.close} align="right" className="w-[220px] p-3">
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
  );
}
