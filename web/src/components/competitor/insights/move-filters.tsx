"use client";

import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";
import { isBrandBidAngle } from "@/lib/comparison/move-brand-bid";
import { cn } from "@/lib/utils";

export type MoveFilterCategory = "all" | "angles" | "platform" | "budget" | "voice";

type Props = {
  moves: ComparisonMoveRow[];
  filter: MoveFilterCategory;
  onFilterChange: (f: MoveFilterCategory) => void;
  significanceHighOnly: boolean;
  onSignificanceChange: (highOnly: boolean) => void;
  hideBrandBids: boolean;
  onHideBrandBidsChange: (hide: boolean) => void;
  brandName: string;
};

function categoryForEvent(e: string): MoveFilterCategory | "other" {
  if (e === "new_platform" || e === "dropped_platform") return "platform";
  if (e === "new_angle" || e === "angle_migration") return "angles";
  if (e === "budget_shift") return "budget";
  if (e === "voice_shift") return "voice";
  return "other";
}

export function countMovesByCategory(moves: ComparisonMoveRow[]): Record<MoveFilterCategory, number> {
  const counts: Record<MoveFilterCategory, number> = {
    all: moves.length,
    angles: 0,
    platform: 0,
    budget: 0,
    voice: 0,
  };
  for (const m of moves) {
    const c = categoryForEvent(m.event_type);
    if (c === "angles") counts.angles += 1;
    else if (c === "platform") counts.platform += 1;
    else if (c === "budget") counts.budget += 1;
    else if (c === "voice") counts.voice += 1;
  }
  return counts;
}

const CHIPS: { id: MoveFilterCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "angles", label: "New angles" },
  { id: "platform", label: "Platform changes" },
  { id: "budget", label: "Budget shifts" },
  { id: "voice", label: "Voice shifts" },
];

export function MoveFiltersBar({
  moves,
  filter,
  onFilterChange,
  significanceHighOnly,
  onSignificanceChange,
  hideBrandBids,
  onHideBrandBidsChange,
  brandName,
}: Props) {
  const counts = countMovesByCategory(moves);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onFilterChange(c.id)}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-medium border transition-all duration-150 active:scale-95",
              filter === c.id
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
          >
            {c.label}{" "}
            <span className={cn("tabular-nums", filter === c.id ? "opacity-80" : "opacity-50")}>
              ({counts[c.id]})
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
        <span className="font-semibold text-slate-500">Significance</span>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="sig"
            checked={!significanceHighOnly}
            onChange={() => onSignificanceChange(false)}
            className="rounded-full border-slate-300"
          />
          All
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="sig"
            checked={significanceHighOnly}
            onChange={() => onSignificanceChange(true)}
            className="rounded-full border-slate-300"
          />
          High only
        </label>
        <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden />
        <label className="inline-flex cursor-pointer select-none items-center gap-2">
          <input
            type="checkbox"
            checked={hideBrandBids}
            onChange={(e) => onHideBrandBidsChange(e.target.checked)}
            className="rounded border-slate-300"
          />
          <span>Hide brand bids</span>
          {brandName ? <span className="text-slate-400">({brandName})</span> : null}
        </label>
      </div>
    </div>
  );
}

/** Client-side: hide legacy brand-bid moves using same rules as detection. */
export function moveIsBrandBidNoise(m: ComparisonMoveRow, brandName: string): boolean {
  if (m.event_type !== "new_angle" && m.event_type !== "angle_migration") return false;
  const ang = (m.after_state as { angle?: string })?.angle ?? "";
  if (!ang || !brandName) return false;
  return isBrandBidAngle(ang, brandName);
}
