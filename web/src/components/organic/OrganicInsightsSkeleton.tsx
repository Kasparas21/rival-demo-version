"use client";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className ?? ""}`} />;
}

function InsightSectionSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <section className="rounded-2xl border border-[#ececef] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <SkeletonBlock className={`h-3.5 ${titleWidth}`} />
      <div className="mt-4 space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="mt-2 h-3.5 w-5/6" />
            <SkeletonBlock className="mt-2 h-3.5 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function OrganicInsightsToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SkeletonBlock className="h-10 w-40 rounded-xl" />
      <SkeletonBlock className="h-10 w-44 rounded-xl" />
    </div>
  );
}

export function OrganicInsightsSkeleton() {
  return (
    <>
      <section className="rounded-2xl border border-[#ececef] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <SkeletonBlock className="h-3.5 w-32" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-[#f4f4f5] bg-[#fafafa]/80 px-4 py-3">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="mt-2 h-6 w-20" />
            </div>
          ))}
        </div>
      </section>

      <InsightSectionSkeleton titleWidth="w-28" />
      <InsightSectionSkeleton titleWidth="w-32" />

      <section className="rounded-2xl border border-[#ececef] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <SkeletonBlock className="h-3.5 w-36" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200">
              <SkeletonBlock className="aspect-video w-full rounded-none" />
              <div className="space-y-2 p-4">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-3.5 w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export function OrganicInsightsLoadingShell() {
  return (
    <div className="space-y-6">
      <OrganicInsightsToolbarSkeleton />
      <OrganicInsightsSkeleton />
    </div>
  );
}

export function InsightAiSectionSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 animate-pulse">
          <div className="h-4 w-full rounded bg-slate-200/80" />
          <div className="mt-2 h-3.5 w-5/6 rounded bg-slate-200/80" />
        </div>
      ))}
    </div>
  );
}
