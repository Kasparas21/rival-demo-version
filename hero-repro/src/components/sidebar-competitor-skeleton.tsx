"use client";

import React from "react";
import { BrandLogoSkeleton } from "@/components/brand-logo-skeleton";

/** Matches sidebar competitor row layout while discovery / Firecrawl runs */
export function SidebarCompetitorSkeleton({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-xl"
        aria-hidden
      >
        <div className="size-10 shrink-0 overflow-hidden rounded-[10px] bg-[#f4f4f5] ring-1 ring-[#e5e7eb]">
          <BrandLogoSkeleton className="size-10 shrink-0 rounded-[10px]" />
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-3"
      aria-hidden
    >
      <BrandLogoSkeleton className="h-12 w-12 shrink-0 rounded-[10px]" />
      <div className="min-w-0 flex-1 space-y-2 py-0.5">
        <div
          className="h-[14px] max-w-[140px] rounded-md bg-gradient-to-r from-slate-200/85 via-slate-100/95 to-slate-200/85"
          style={{ animation: "rival-logo-shimmer 1.5s ease-in-out infinite" }}
        />
        <div
          className="h-[11px] max-w-[100px] rounded-md bg-slate-200/60"
          style={{ animation: "rival-logo-shimmer 1.5s ease-in-out infinite 0.2s" }}
        />
      </div>
    </div>
  );
}
