"use client";

import { useMemo, useState } from "react";
import { PreviewGlassPanel } from "@/components/feature-previews/preview-glass-panel";
import { PLATFORMS, type PlatformName } from "@/components/feature-previews/platform-utils";

type Tier = "PRIMARY" | "SECONDARY" | "MINIMAL" | "INACTIVE";

const BASE_COUNTS: Record<PlatformName, number> = {
  Meta: 12,
  Google: 8,
  TikTok: 5,
  LinkedIn: 6,
  Pinterest: 3,
  Snapchat: 1,
};

function classify(count: number): Tier {
  if (count >= 10) return "PRIMARY";
  if (count >= 5) return "SECONDARY";
  if (count >= 2) return "MINIMAL";
  return "INACTIVE";
}

const TIER_STYLE: Record<Tier, string> = {
  PRIMARY: "bg-[#4a7fa5]/15 text-[#1e4a63] border-[#4a7fa5]/30",
  SECONDARY: "bg-[#dbeafe]/80 text-[#1e40af] border-[#93c5fd]/50",
  MINIMAL: "bg-[#fef3c7]/80 text-[#92400e] border-[#fcd34d]/50",
  INACTIVE: "bg-gray-100 text-gray-500 border-gray-200",
};

export function PlatformPrioritizationPreview() {
  const [scale, setScale] = useState(1);

  const rows = useMemo(
    () =>
      PLATFORMS.map((platform) => {
        const count = Math.max(0, Math.round(BASE_COUNTS[platform] * scale));
        return { platform, count, tier: classify(count) };
      }),
    [scale]
  );

  return (
    <PreviewGlassPanel>
      <label className="block text-[11px] font-semibold text-gray-600">
        Total ad volume multiplier: {scale.toFixed(1)}×
        <input
          type="range"
          min={0.3}
          max={1.8}
          step={0.1}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="mt-1.5 w-full accent-[#4a7fa5]"
          aria-valuetext={`${scale.toFixed(1)} times base volume`}
        />
      </label>
      <ul className="mt-3 space-y-1.5" aria-live="polite">
        {rows.map(({ platform, count, tier }) => (
          <li
            key={platform}
            className="flex items-center justify-between rounded-lg border border-white/75 bg-white/55 px-3 py-2"
          >
            <span className="text-xs font-semibold text-[#1a1a1a]">{platform}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{count} ads</span>
              <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${TIER_STYLE[tier]}`}>{tier}</span>
            </div>
          </li>
        ))}
      </ul>
    </PreviewGlassPanel>
  );
}
