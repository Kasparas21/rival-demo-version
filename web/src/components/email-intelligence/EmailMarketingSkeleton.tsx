import { alertGlassPanelClass, alertGlassShellClass } from "@/components/competitor/alerts/alert-ui-styles";
import { cn } from "@/lib/utils";

export function EmailTrackerBarSkeleton() {
  return (
    <div className={cn(alertGlassPanelClass, "px-4 py-3")}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-28 animate-pulse rounded-full bg-slate-200/80" />
          <div className="h-4 w-48 animate-pulse rounded-md bg-slate-100" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-xl lg:justify-end">
          <div className="h-9 min-w-0 flex-1 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-9 w-16 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function EmailSubTabsSkeleton() {
  return (
    <div className="-mb-px flex gap-4 border-b border-slate-200/80 pb-2.5">
      <div className="h-4 w-12 animate-pulse rounded bg-slate-200/80" />
      <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export function EmailInboxListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div
              className="h-3.5 animate-pulse rounded-md bg-slate-200/90"
              style={{ width: `${68 - i * 8}%` }}
            />
            <div className="h-5 w-14 shrink-0 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 space-y-1.5">
            <div className="h-3 w-full animate-pulse rounded bg-slate-100/90" />
            <div className="h-3 w-[92%] animate-pulse rounded bg-slate-100/80" />
          </div>
          <div className="mt-2.5 h-5 w-[4.5rem] animate-pulse rounded-full bg-slate-100" />
        </div>
      ))}
    </>
  );
}

export function EmailInboxSkeleton() {
  return (
    <div className={cn(alertGlassShellClass, "overflow-hidden")}>
      <div className="flex items-center justify-between border-b border-white/60 bg-white/40 px-4 py-2.5">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="border-b border-white/50 bg-white/25 px-4 py-2.5">
        <div className="h-9 w-full animate-pulse rounded-xl bg-slate-100/90" />
      </div>
      <div className="border-b border-white/50 bg-white/25 px-4 py-2.5">
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-slate-100" />
          ))}
        </div>
      </div>
      <div className="bg-slate-100/60 p-2">
        <div className="space-y-2">
          <EmailInboxListSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}

export function EmailMarketingContentSkeleton() {
  return (
    <div className="space-y-4">
      <EmailTrackerBarSkeleton />
      <EmailSubTabsSkeleton />
      <EmailInboxSkeleton />
    </div>
  );
}
