"use client";

import { SkPanel, SkSectionHeader } from "@/components/ui/feature-skeleton";

/** Minimal strategy map placeholder — a few large blocks, not a detailed mock UI. */
export function StrategyMapSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading strategy map">
      <SkSectionHeader className="mb-6" />
      <div className="flex flex-col gap-6 xl:flex-row">
        <SkPanel className="h-[min(680px,78vh)] w-full flex-1" />
        <div className="flex w-full shrink-0 flex-col gap-3 xl:w-[min(520px,36vw)] xl:max-w-[520px]">
          <SkPanel className="h-44" />
          <SkPanel className="h-52" />
        </div>
      </div>
    </div>
  );
}
