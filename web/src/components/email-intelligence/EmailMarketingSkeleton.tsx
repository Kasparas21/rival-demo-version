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

export function EmailInboxSkeleton() {
  return (
    <div className={cn(alertGlassShellClass, "overflow-hidden")}>
      <div className="flex items-center justify-between border-b border-white/60 bg-white/40 px-4 py-2.5">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="grid min-h-[420px] grid-cols-1 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <div className="space-y-0 border-b border-slate-100 p-2 lg:border-b-0 lg:border-r">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-slate-100/90 px-4 py-3.5">
              <div className="flex items-start gap-2">
                <div className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-slate-200" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex justify-between gap-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/90" />
                    <div className="h-3 w-10 shrink-0 animate-pulse rounded bg-slate-100" />
                  </div>
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-5">
          <div className="h-6 w-2/3 animate-pulse rounded-lg bg-slate-200/90" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="mt-5 h-36 animate-pulse rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50" />
          <div className="mt-4 h-3 w-24 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-48 animate-pulse rounded-2xl bg-slate-100" />
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
