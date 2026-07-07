"use client";

import { COMPETITOR_PAGE_SHELL } from "@/components/dashboard/competitor/competitor-page-layout";
import { SkBar } from "@/components/ui/feature-skeleton";
import { cn } from "@/lib/utils";

function SkBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200/80", className)} aria-hidden />;
}

export function TrackedPageRowSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/70 p-3 sm:p-4"
      aria-hidden
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
        <SkBlock className="aspect-[16/10] w-full shrink-0 sm:w-44 md:w-52" />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-0.5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SkBlock className="h-4 w-28" />
              <SkBlock className="h-4 w-24 rounded-full" />
            </div>
            <SkBlock className="h-3 w-40 max-w-full" />
            <SkBlock className="h-3 w-56 max-w-full" />
          </div>
          <div className="flex gap-2">
            <SkBlock className="h-8 w-16 rounded-lg" />
            <SkBlock className="h-8 w-28 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrackedPagesSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading tracked pages">
      <SkBlock className="mb-4 h-10 w-full rounded-xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <TrackedPageRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function LatestChangeCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-4 sm:p-5"
      aria-hidden
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <SkBlock className="h-2.5 w-2.5 rounded-full" />
            <SkBlock className="h-4 w-24" />
            <SkBlock className="h-3 w-12" />
          </div>
          <SkBlock className="h-3 w-36" />
        </div>
        <SkBlock className="h-6 w-28 shrink-0 rounded-full" />
      </div>
      <SkBlock className="mb-4 h-3 w-full max-w-md" />
      <div className="mb-4 flex gap-2">
        <SkBlock className="h-5 w-14 rounded-full" />
        <SkBlock className="h-5 w-20 rounded-full" />
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SkBlock className="h-48 w-full rounded-xl" />
        <SkBlock className="h-48 w-full rounded-xl" />
      </div>
      <div className="flex gap-2">
        <SkBlock className="h-9 w-28 rounded-lg" />
        <SkBlock className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  );
}

export function LatestChangesSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading latest changes">
      <div className="mb-4 flex flex-wrap gap-2" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkBlock key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      {Array.from({ length: cards }).map((_, i) => (
        <LatestChangeCardSkeleton key={i} />
      ))}
    </div>
  );
}

function LandingPageListRowSkeleton() {
  return (
    <div className="flex h-14 w-full items-center gap-2 rounded-lg px-3 py-2" aria-hidden>
      <SkBlock className="h-8 w-8 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <SkBlock className="h-3 w-full max-w-[12rem]" />
        <SkBlock className="h-2.5 w-20" />
      </div>
      <SkBlock className="h-4 w-6 shrink-0 rounded" />
    </div>
  );
}

export function FromAdsSkeleton() {
  return (
    <div className={COMPETITOR_PAGE_SHELL} aria-busy="true" aria-label="Loading landing pages">
      <div className="mb-6 space-y-2" aria-hidden>
        <SkBar className="h-3 w-24" />
        <SkBar className="h-7 w-48" />
        <SkBar className="h-4 w-32" />
      </div>

      <div className="mt-6 flex flex-col-reverse gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-[38%]">
          <SkBlock className="mb-4 h-10 w-full rounded-xl" />
          <SkBlock className="mb-2 h-3 w-28" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <LandingPageListRowSkeleton key={i} />
            ))}
          </div>
        </aside>

        <section className="min-w-0 flex-1 lg:w-[62%]">
          <div className="space-y-4">
            <div className="flex gap-2" aria-hidden>
              <SkBlock className="h-10 min-w-0 flex-1 rounded-xl" />
              <SkBlock className="h-10 w-20 shrink-0 rounded-xl" />
              <SkBlock className="h-10 w-20 shrink-0 rounded-xl" />
            </div>
            <SkBlock className="min-h-[400px] w-full rounded-xl" />
            <div className="space-y-3" aria-hidden>
              <SkBlock className="h-4 w-40" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-slate-200/90 bg-white">
                    <SkBlock className="aspect-[4/5] w-full rounded-none" />
                    <div className="space-y-2 border-t border-slate-100 p-2.5">
                      <SkBlock className="h-3 w-full" />
                      <SkBlock className="h-2.5 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}