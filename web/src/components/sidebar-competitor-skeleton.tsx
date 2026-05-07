"use client";

import React from "react";
import { BrandLogoSkeleton } from "@/components/brand-logo-skeleton";

/** Matches sidebar competitor row layout while discovery / Firecrawl runs */
export function SidebarCompetitorSkeleton({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl" aria-hidden>
        <div className="size-10 shrink-0 overflow-hidden rounded-[10px] bg-[#ececef] ring-1 ring-[#e5e7eb]">
          <BrandLogoSkeleton className="size-10 shrink-0 rounded-[10px]" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-xl px-3 py-3" aria-hidden>
      <BrandLogoSkeleton className="h-12 w-12 shrink-0 rounded-[10px]" />
      <div className="min-w-0 flex-1 space-y-2 overflow-hidden py-0.5">
        <div className="h-[14px] max-w-[140px] overflow-hidden rounded-md bg-[#e4e4e7]">
          <div className="rival-sidebar-line-shimmer h-full w-full" />
        </div>
        <div className="h-[11px] max-w-[100px] overflow-hidden rounded-md bg-[#e8e8ea]">
          <div className="rival-sidebar-line-shimmer h-full w-full [animation-delay:120ms]" />
        </div>
      </div>
    </div>
  );
}
