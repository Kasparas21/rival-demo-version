"use client";

import type { ReactNode } from "react";

import { ORGANIC_POSTS_GRID_CLASS } from "@/components/organic/organic-feed-layout";

export function OrganicEmptyWithPlaceholders({ message }: { message: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-[#e2e8f0] bg-white/70 px-4 py-3.5 text-[14px] leading-relaxed text-[#475569] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {message}
      </div>
      <div className={ORGANIC_POSTS_GRID_CLASS}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#cbd5e1] bg-[#f8fafc]/60 px-4 py-6 text-center"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
              Post slot
            </span>
            <p className="max-w-[13rem] text-[13px] leading-snug text-[#94a3b8]">
              Scraped posts will appear here after a successful load.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
