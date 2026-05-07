"use client";

import { type StrategyViewMode } from "@/lib/strategy-overview/strategy-overview-store";

type Props = {
  view: StrategyViewMode;
  onChange: (v: StrategyViewMode) => void;
};

export function StrategyViewToggle({ view, onChange }: Props) {
  return (
    <div className="flex justify-center mb-6">
      <div className="inline-flex rounded-full border border-slate-200/90 bg-white/80 p-1 shadow-sm">
        {(
          [
            ["map", "Strategy map"],
            ["insight", "Strategy insight"],
          ] as const
        ).map(([id, label]) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                active ? "bg-slate-200/90 text-[#0f172a]" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
