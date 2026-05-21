"use client";

import { useState } from "react";
import { PreviewGlassPanel } from "@/components/feature-previews/preview-glass-panel";

type Bar = { id: string; label: string; start: number; end: number; live: boolean; platform: string };

const BARS: Bar[] = [
  { id: "1", label: "Social proof hook", start: 8, end: 100, live: true, platform: "Meta" },
  { id: "2", label: "Comparison keyword", start: 25, end: 88, live: true, platform: "Google" },
  { id: "3", label: "UGC creator ad", start: 40, end: 72, live: false, platform: "TikTok" },
  { id: "4", label: "Case study MOF", start: 15, end: 95, live: true, platform: "LinkedIn" },
  { id: "5", label: "Seasonal pin", start: 55, end: 70, live: false, platform: "Pinterest" },
  { id: "6", label: "App install BOF", start: 30, end: 100, live: true, platform: "Snapchat" },
];

export function TimelinePreview() {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <PreviewGlassPanel>
      <div className="space-y-3">
        {BARS.map((bar) => (
          <div key={bar.id} className="relative">
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="font-semibold text-[#1a1a1a]">{bar.label}</span>
              <span className="text-gray-500">{bar.platform}</span>
            </div>
            <div className="relative h-5 rounded-full bg-white/50 ring-1 ring-black/[0.04]">
              <button
                type="button"
                aria-label={`${bar.label}: day ${bar.start} to ${bar.end}${bar.live ? ", live" : ", ended"}`}
                className={`absolute top-0.5 h-4 rounded-full transition ${
                  bar.live ? "bg-[#4a7fa5]/70 hover:bg-[#4a7fa5]/85" : "bg-gray-300/80 line-through opacity-70"
                }`}
                style={{ left: `${bar.start}%`, width: `${bar.end - bar.start}%` }}
                onMouseEnter={() => setHover(bar.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(bar.id)}
                onBlur={() => setHover(null)}
              />
              {hover === bar.id ? (
                <span
                  role="tooltip"
                  className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1a1a1a] px-2 py-1 text-[10px] text-white"
                >
                  Day {bar.start} → {bar.end} · {bar.live ? "Live" : "Killed"}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-gray-500">Hover or tap a bar for launch → last-seen dates.</p>
    </PreviewGlassPanel>
  );
}
