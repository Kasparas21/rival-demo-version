"use client";

import type { ReactNode } from "react";

import { COMPETITOR_PAGE_SHELL } from "@/components/dashboard/competitor/competitor-page-layout";
import { cn } from "@/lib/utils";

export function SkBar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200/75", className)} aria-hidden />;
}

export function SkSectionHeader({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)} aria-hidden>
      <SkBar className="h-3 w-24" />
      <SkBar className="h-7 w-56 max-w-full" />
      <SkBar className="h-4 w-full max-w-lg" />
    </div>
  );
}

export function SkPillRow({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <SkBar key={i} className={cn("h-8 rounded-full", i === 0 ? "w-[7.5rem]" : "w-[6.5rem]")} />
      ))}
    </div>
  );
}

export function SkListRows({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <SkBar key={i} className="h-[3.25rem] w-full rounded-xl" />
      ))}
    </div>
  );
}

export function SkPanel({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100/40 animate-pulse",
        className,
      )}
      aria-hidden
    >
      {children}
    </div>
  );
}

export function CreativeTestsSkeleton() {
  return (
    <div className={COMPETITOR_PAGE_SHELL} aria-busy="true" aria-label="Loading creative tests">
      <SkSectionHeader className="mb-6" />
      <SkPillRow count={5} className="mb-6" />
      <SkListRows count={7} />
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className={`${COMPETITOR_PAGE_SHELL} space-y-6`} aria-busy="true" aria-label="Loading timeline">
      <SkPanel className="h-32" />
      <SkPillRow count={6} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkPanel key={i} className="h-28" />
        ))}
      </div>
      <SkPanel className="h-80" />
      <SkPanel className="h-[22rem]" />
    </div>
  );
}

export function LandingPagesSkeleton() {
  return (
    <div className={COMPETITOR_PAGE_SHELL} aria-busy="true" aria-label="Loading landing pages">
      <SkSectionHeader className="mb-6" />
      <SkBar className="mb-6 h-10 w-full max-w-md rounded-xl" />
      <div className="flex flex-col gap-6 lg:flex-row">
        <SkPanel className="h-[28rem] w-full lg:w-[38%]" />
        <SkPanel className="min-h-[28rem] flex-1" />
      </div>
    </div>
  );
}

export function ComparisonSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading comparison">
      <div className="grid gap-4 md:grid-cols-3">
        <SkPanel className="h-36" />
        <SkPanel className="h-36" />
        <SkPanel className="h-36" />
      </div>
      <SkPanel className="h-24" />
      <SkPanel className="h-44" />
      <SkPanel className="h-52" />
    </div>
  );
}

function SkSavedAdCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white" aria-hidden>
      <SkBar className="aspect-square w-full rounded-none" />
      <div className="space-y-2.5 p-3">
        <SkBar className="h-3.5 w-full" />
        <SkBar className="h-3 w-2/3" />
        <SkBar className="h-2.5 w-24" />
        <SkBar className="mt-1 h-7 w-20 rounded-md" />
      </div>
    </div>
  );
}

export function SavedAdsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading saved ads">
      <SkSectionHeader className="mb-6" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkSavedAdCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function AdDetailDrawerSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden" aria-busy="true" aria-label="Loading ad details">
      <div className="flex flex-1 items-start justify-center overflow-y-auto bg-slate-50 p-6 sm:p-8">
        <SkPanel className="h-[32rem] w-full max-w-md" />
      </div>
      <div className="flex w-[min(100%,400px)] flex-shrink-0 flex-col border-l border-slate-200 p-4">
        <SkBar className="mb-4 h-10 w-full rounded-lg" />
        <div className="mb-5 flex gap-6 border-b border-slate-100 pb-3">
          <SkBar className="h-3.5 w-14" />
          <SkBar className="h-3.5 w-20" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <SkBar key={i} className={cn("h-3.5", i % 3 === 0 ? "w-full" : "w-4/5")} />
          ))}
        </div>
      </div>
    </div>
  );
}
