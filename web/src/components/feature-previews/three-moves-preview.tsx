"use client";

import { useState } from "react";
import { PreviewGlassPanel } from "@/components/feature-previews/preview-glass-panel";

type Move = { tag: string; title: string; detail: string; color: string };

const SETS: Move[][] = [
  [
    {
      tag: "REFRESH CREATIVE",
      title: "Replace brand-only Google ads with proof-led hooks",
      detail: "They run 4 price-angle Meta ads live 90+ days — you run 0.",
      color: "bg-[#fef3c7] text-[#92400e]",
    },
    {
      tag: "DEFEND",
      title: "Extend Meta subsidy creative before fatigue hits",
      detail: "Their discount angle has 5 live variants; yours has 1, running 62 days.",
      color: "bg-[#dcfce7] text-[#166534]",
    },
    {
      tag: "STEAL ANGLE",
      title: "Test their top LinkedIn case-study hook on Meta",
      detail: "MOF case-study ads on LinkedIn — 6 live, avg 48 days — not in your library.",
      color: "bg-[#dbeafe] text-[#1e40af]",
    },
  ],
  [
    {
      tag: "SHIFT BUDGET",
      title: "Move 15% from declining Snapchat to TikTok TOF",
      detail: "Snapchat BOF down 40% vs last month; TikTok UGC up 3× engagement.",
      color: "bg-[#dbeafe] text-[#1e40af]",
    },
    {
      tag: "REFRESH CREATIVE",
      title: "Launch 2 Pinterest catalog variants they already run",
      detail: "They have 3 stable Pinterest MOF ads — you have none in catalog format.",
      color: "bg-[#fef3c7] text-[#92400e]",
    },
    {
      tag: "DEFEND",
      title: "Protect Google brand terms with comparison copy",
      detail: "Competitor comparison keywords appeared in 2 new Google ads this week.",
      color: "bg-[#dcfce7] text-[#166534]",
    },
  ],
  [
    {
      tag: "STEAL ANGLE",
      title: "Copy their longest-running Meta social-proof hook",
      detail: "Customer-story ad live 94 days — highest lifespan in their Meta library.",
      color: "bg-[#dbeafe] text-[#1e40af]",
    },
    {
      tag: "REFRESH CREATIVE",
      title: "Retire stale TikTok hooks past 45-day median",
      detail: "3 of your 4 TikTok ads exceed competitor median lifespan.",
      color: "bg-[#fef3c7] text-[#92400e]",
    },
    {
      tag: "SHIFT BUDGET",
      title: "Double down on LinkedIn MOF — their flagship channel",
      detail: "LinkedIn MOF is FLAGSHIP with 6 active ads vs your 1.",
      color: "bg-[#dcfce7] text-[#166534]",
    },
  ],
];

export function ThreeMovesPreview() {
  const [setIndex, setSetIndex] = useState(0);
  const moves = SETS[setIndex] ?? SETS[0];

  return (
    <PreviewGlassPanel>
      <div className="space-y-2.5">
        {moves.map((move, i) => (
          <article key={`${setIndex}-${move.title}`} className="rounded-xl border border-white/75 bg-white/55 p-3">
            <div className="flex items-start gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#4a7fa5] text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0">
                <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${move.color}`}>{move.tag}</span>
                <p className="mt-1 text-xs font-semibold leading-snug text-[#1a1a1a]">{move.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{move.detail}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setSetIndex((i) => (i + 1) % SETS.length)}
        className="mt-3 w-full rounded-full border border-[#4a7fa5]/30 bg-[#4a7fa5]/10 px-4 py-2 text-xs font-semibold text-[#4a7fa5] transition hover:bg-[#4a7fa5]/15"
      >
        Regenerate moves
      </button>
    </PreviewGlassPanel>
  );
}
