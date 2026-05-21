"use client";

import { PreviewGlassPanel } from "@/components/feature-previews/preview-glass-panel";

const BULLETS = [
  "New angle launched: \"Free consultation this week\" on Meta (3 new creatives).",
  "Platform shift: Google spend signals up — 2 new comparison keywords detected.",
  "Budget move: LinkedIn MOF ads increased from 4 → 6 live creatives.",
  "Creative refresh: TikTok UGC hook retired after 52 days; replaced with creator duet.",
];

export function MondayDigestPreview() {
  return (
    <PreviewGlassPanel label="Interactive preview · mock email">
      <div className="rounded-xl border border-white/75 bg-white/60 p-3 shadow-sm">
        <div className="border-b border-gray-200/80 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#4a7fa5]">Monday digest</p>
          <p className="text-xs font-semibold text-[#1a1a1a]">What changed this week · Meliva</p>
          <p className="text-[10px] text-gray-500">Mon, 8:00 AM · 4 updates</p>
        </div>
        <ul className="mt-2.5 space-y-2">
          {BULLETS.map((item) => (
            <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-gray-600">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#4a7fa5]" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </PreviewGlassPanel>
  );
}
