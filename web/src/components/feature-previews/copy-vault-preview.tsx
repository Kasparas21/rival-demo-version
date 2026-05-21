"use client";

import { useMemo, useState } from "react";
import { PreviewGlassPanel } from "@/components/feature-previews/preview-glass-panel";

type Headline = { id: string; text: string; days: number; platform: string };

const HEADLINES: Headline[] = [
  { id: "1", text: "Free shipping ends Sunday — shop now", days: 94, platform: "Meta" },
  { id: "2", text: "Compare plans side by side", days: 62, platform: "Google" },
  { id: "3", text: "POV: you track every competitor ad", days: 41, platform: "TikTok" },
  { id: "4", text: "How we cut CAC 22% in one quarter", days: 38, platform: "LinkedIn" },
  { id: "5", text: "Spring lookbook — tap to explore", days: 21, platform: "Pinterest" },
  { id: "6", text: "Limited drop — swipe up", days: 7, platform: "Snapchat" },
];

type SortMode = "lifespan" | "newest";

export function CopyVaultPreview() {
  const [sort, setSort] = useState<SortMode>("lifespan");

  const sorted = useMemo(() => {
    const copy = [...HEADLINES];
    if (sort === "lifespan") copy.sort((a, b) => b.days - a.days);
    else copy.sort((a, b) => a.days - b.days);
    return copy;
  }, [sort]);

  return (
    <PreviewGlassPanel>
      <div className="flex gap-2" role="group" aria-label="Sort headlines">
        <button
          type="button"
          onClick={() => setSort("lifespan")}
          className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
            sort === "lifespan" ? "bg-[#4a7fa5] text-white" : "bg-white/60 text-gray-600"
          }`}
        >
          Lifespan
        </button>
        <button
          type="button"
          onClick={() => setSort("newest")}
          className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
            sort === "newest" ? "bg-[#4a7fa5] text-white" : "bg-white/60 text-gray-600"
          }`}
        >
          Newest
        </button>
      </div>
      <ul className="mt-3 space-y-2" aria-live="polite">
        {sorted.map((h, i) => (
          <li key={h.id} className="flex items-start justify-between gap-2 rounded-xl border border-white/75 bg-white/55 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#1a1a1a]">{h.text}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">{h.platform}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                i === 0 && sort === "lifespan" ? "bg-[#95C14B]/20 text-[#3d5c1f]" : "bg-gray-100 text-gray-600"
              }`}
            >
              {h.days}d
            </span>
          </li>
        ))}
      </ul>
    </PreviewGlassPanel>
  );
}
