"use client";

import { useState } from "react";
import { PreviewGlassPanel } from "@/components/feature-previews/preview-glass-panel";

type AngleSet = { them: string[]; you: string[]; stealable: string[] };

const COMPETITORS: Record<string, AngleSet> = {
  Nike: {
    them: ["Athlete social proof", "Limited drop urgency", "Performance tech specs", "Community challenge"],
    you: ["Performance tech specs", "Free shipping promo", "Seasonal sale"],
    stealable: ["Athlete social proof", "Limited drop urgency", "Community challenge"],
  },
  Glossier: {
    them: ["UGC unboxing", "Skin-type quiz CTA", "Before/after routine", "Influencer duet"],
    you: ["Free shipping promo", "Before/after routine"],
    stealable: ["UGC unboxing", "Skin-type quiz CTA", "Influencer duet"],
  },
};

export function StealableAnglesPreview() {
  const [competitor, setCompetitor] = useState<keyof typeof COMPETITORS>("Nike");
  const data = COMPETITORS[competitor];

  return (
    <PreviewGlassPanel>
      <div className="flex gap-2">
        {(Object.keys(COMPETITORS) as (keyof typeof COMPETITORS)[]).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setCompetitor(name)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              competitor === name ? "bg-[#4a7fa5] text-white" : "bg-white/60 text-gray-600 hover:bg-white/80"
            }`}
          >
            vs {name}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Them</p>
          <ul className="mt-1.5 space-y-1">
            {data.them.map((angle) => (
              <li
                key={angle}
                className={`rounded-lg px-2 py-1.5 text-[11px] ${
                  data.stealable.includes(angle)
                    ? "border border-[#4a7fa5]/30 bg-[#4a7fa5]/10 font-semibold text-[#1e4a63]"
                    : "bg-white/50 text-gray-600"
                }`}
              >
                {angle}
                {data.stealable.includes(angle) ? (
                  <span className="ml-1 rounded bg-[#4a7fa5] px-1 py-0.5 text-[8px] font-bold text-white">steal this</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">You</p>
          <ul className="mt-1.5 space-y-1">
            {data.you.map((angle) => (
              <li key={angle} className="rounded-lg bg-white/50 px-2 py-1.5 text-[11px] text-gray-600">
                {angle}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PreviewGlassPanel>
  );
}
