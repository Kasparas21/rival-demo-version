"use client";

import { useMemo, useState } from "react";
import { PreviewGlassPanel } from "@/components/feature-previews/preview-glass-panel";
import { PLATFORMS, PlatformBadge, type PlatformName } from "@/components/feature-previews/platform-utils";

type MockAd = { id: string; platform: PlatformName; headline: string; status: string };

const MOCK_ADS: MockAd[] = [
  { id: "1", platform: "Meta", headline: "Free shipping this week only", status: "Live · 42d" },
  { id: "2", platform: "Google", headline: "Compare plans — start free", status: "Live · 18d" },
  { id: "3", platform: "TikTok", headline: "POV: you finally track competitors", status: "Live · 7d" },
  { id: "4", platform: "LinkedIn", headline: "How we cut CAC 22% in Q1", status: "Live · 31d" },
  { id: "5", platform: "Pinterest", headline: "Spring collection lookbook", status: "Live · 14d" },
  { id: "6", platform: "Snapchat", headline: "Swipe up — limited drop", status: "Live · 5d" },
  { id: "7", platform: "Meta", headline: "Customer story: 3× ROAS", status: "Live · 90d" },
  { id: "8", platform: "Google", headline: "Brand vs non-brand split", status: "Ended · 12d" },
];

export function AdLibraryPreview() {
  const [filter, setFilter] = useState<PlatformName | "All">("All");

  const visible = useMemo(
    () => (filter === "All" ? MOCK_ADS : MOCK_ADS.filter((ad) => ad.platform === filter)),
    [filter]
  );

  return (
    <PreviewGlassPanel>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by platform">
        <button
          type="button"
          role="tab"
          aria-selected={filter === "All"}
          onClick={() => setFilter("All")}
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            filter === "All" ? "bg-[#4a7fa5] text-white" : "bg-white/60 text-gray-600 hover:bg-white/80"
          }`}
        >
          All
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={filter === p}
            onClick={() => setFilter(p)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              filter === p ? "bg-[#4a7fa5] text-white" : "bg-white/60 text-gray-600 hover:bg-white/80"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-live="polite">
        {visible.map((ad) => (
          <li
            key={ad.id}
            className="rounded-xl border border-white/75 bg-white/55 p-2.5 shadow-sm transition hover:bg-white/70"
          >
            <PlatformBadge platform={ad.platform} />
            <p className="mt-2 text-xs font-semibold leading-snug text-[#1a1a1a]">{ad.headline}</p>
            <p className="mt-1 text-[10px] text-gray-500">{ad.status}</p>
          </li>
        ))}
      </ul>
    </PreviewGlassPanel>
  );
}
