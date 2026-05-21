"use client";

import { useState } from "react";
import { PreviewGlassPanel } from "@/components/feature-previews/preview-glass-panel";
import { PLATFORMS } from "@/components/feature-previews/platform-utils";

type Tag = "FLAGSHIP" | "TESTING" | "STABLE" | "DECLINING";
type Stage = "TOF" | "MOF" | "BOF";

type Cell = { tag: Tag; intensity: number; tip: string };

const STAGES: Stage[] = ["TOF", "MOF", "BOF"];

const TAG_STYLE: Record<Tag, string> = {
  FLAGSHIP: "bg-[#4a7fa5]/20 text-[#1e4a63] border-[#4a7fa5]/30",
  TESTING: "bg-[#fef3c7]/80 text-[#92400e] border-[#fcd34d]/60",
  STABLE: "bg-[#dcfce7]/80 text-[#166534] border-[#86efac]/60",
  DECLINING: "bg-[#f3f4f6] text-gray-500 border-gray-200",
};

const GRID: Record<(typeof PLATFORMS)[number], Record<Stage, Cell>> = {
  Meta: {
    TOF: { tag: "TESTING", intensity: 0.35, tip: "2 TOF creatives — light prospecting tests." },
    MOF: { tag: "FLAGSHIP", intensity: 0.9, tip: "5 MOF ads — core retargeting engine." },
    BOF: { tag: "STABLE", intensity: 0.55, tip: "3 BOF offers — steady conversion push." },
  },
  Google: {
    TOF: { tag: "STABLE", intensity: 0.5, tip: "Brand + category search holding steady." },
    MOF: { tag: "TESTING", intensity: 0.4, tip: "New comparison keywords in trial." },
    BOF: { tag: "DECLINING", intensity: 0.2, tip: "Legacy shopping ads winding down." },
  },
  TikTok: {
    TOF: { tag: "FLAGSHIP", intensity: 0.85, tip: "UGC hooks dominate top-of-funnel." },
    MOF: { tag: "TESTING", intensity: 0.45, tip: "Creator whitelisting experiments." },
    BOF: { tag: "TESTING", intensity: 0.3, tip: "Spark ads for BOF still early." },
  },
  LinkedIn: {
    TOF: { tag: "STABLE", intensity: 0.5, tip: "Thought-leadership TOF at steady cadence." },
    MOF: { tag: "FLAGSHIP", intensity: 0.8, tip: "Case-study MOF is primary channel." },
    BOF: { tag: "DECLINING", intensity: 0.25, tip: "Demo-request BOF ads tapering off." },
  },
  Pinterest: {
    TOF: { tag: "TESTING", intensity: 0.35, tip: "Seasonal pins in discovery phase." },
    MOF: { tag: "STABLE", intensity: 0.55, tip: "Catalog MOF performing consistently." },
    BOF: { tag: "TESTING", intensity: 0.3, tip: "Promo pins testing conversion." },
  },
  Snapchat: {
    TOF: { tag: "DECLINING", intensity: 0.15, tip: "Minimal TOF — channel deprioritized." },
    MOF: { tag: "TESTING", intensity: 0.4, tip: "Story ads in small MOF test." },
    BOF: { tag: "STABLE", intensity: 0.5, tip: "App-install BOF holding baseline." },
  },
};

export function StrategyMapPreview() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <PreviewGlassPanel>
      <div className="overflow-x-auto">
        <div className="min-w-[280px]">
          <div className="grid grid-cols-4 gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
            <div />
            {STAGES.map((s) => (
              <div key={s} className="text-center">
                {s}
              </div>
            ))}
          </div>
          {PLATFORMS.map((platform) => (
            <div key={platform} className="mt-1.5 grid grid-cols-4 gap-1.5">
              <div className="flex items-center text-[11px] font-semibold text-[#1a1a1a]">{platform}</div>
              {STAGES.map((stage) => {
                const cell = GRID[platform][stage];
                const key = `${platform}-${stage}`;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-describedby={active === key ? `${key}-tip` : undefined}
                    onClick={() => setActive(active === key ? null : key)}
                    onMouseEnter={() => setActive(key)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(key)}
                    onBlur={() => setActive(null)}
                    className="relative rounded-lg border border-white/70 p-1.5 text-left transition hover:ring-2 hover:ring-[#4a7fa5]/25"
                    style={{ backgroundColor: `rgba(74, 127, 165, ${cell.intensity * 0.35})` }}
                  >
                    <span className={`inline-block rounded px-1 py-0.5 text-[8px] font-bold border ${TAG_STYLE[cell.tag]}`}>
                      {cell.tag}
                    </span>
                    {active === key ? (
                      <span
                        id={`${key}-tip`}
                        role="tooltip"
                        className="absolute left-1/2 top-full z-10 mt-1 w-36 -translate-x-1/2 rounded-lg border border-white/80 bg-white/95 px-2 py-1.5 text-[10px] font-normal normal-case leading-snug text-gray-600 shadow-lg"
                      >
                        {cell.tip}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </PreviewGlassPanel>
  );
}
