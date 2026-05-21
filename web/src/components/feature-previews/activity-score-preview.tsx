"use client";

import { useState } from "react";
import { PreviewGlassPanel } from "@/components/feature-previews/preview-glass-panel";

const COMPETITORS = [
  { name: "Meliva", score: 46, tier: "Tier 3" },
  { name: "Nike", score: 78, tier: "Tier 1" },
  { name: "Glossier", score: 61, tier: "Tier 2" },
];

export function ActivityScorePreview() {
  const [index, setIndex] = useState(0);
  const current = COMPETITORS[index] ?? COMPETITORS[0];
  const rotation = -90 + (current.score / 100) * 180;

  return (
    <PreviewGlassPanel>
      <div className="flex flex-col items-center">
        <div className="relative h-28 w-48 overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-24 rounded-t-full border-[10px] border-b-0 border-gray-200/80" />
          <div
            className="absolute bottom-0 left-1/2 h-[72px] w-1 origin-bottom rounded-full bg-[#4a7fa5] transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
            aria-hidden
          />
          <p className="absolute inset-x-0 bottom-1 text-center text-2xl font-bold text-[#1a1a1a]">{current.score}</p>
        </div>
        <p className="mt-1 text-sm font-semibold text-[#1a1a1a]">{current.name}</p>
        <p className="text-[11px] text-gray-500">{current.tier} · High confidence</p>
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % COMPETITORS.length)}
          className="mt-3 rounded-full border border-[#4a7fa5]/30 bg-[#4a7fa5]/10 px-4 py-2 text-xs font-semibold text-[#4a7fa5] transition hover:bg-[#4a7fa5]/15"
        >
          Switch competitor
        </button>
      </div>
    </PreviewGlassPanel>
  );
}
