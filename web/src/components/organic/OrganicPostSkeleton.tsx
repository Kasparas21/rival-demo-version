"use client";

export function OrganicPostSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white animate-pulse">
      <div className="flex items-center gap-3 border-b border-[#f1f5f9] p-4">
        <div className="h-10 w-10 shrink-0 rounded-full bg-[#e5e7eb]" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-32 rounded bg-[#e5e7eb]" />
          <div className="h-3 w-20 rounded bg-[#e5e7eb]" />
        </div>
      </div>
      <div className="space-y-2 px-4 py-3">
        <div className="h-3.5 w-full rounded bg-[#e5e7eb]" />
        <div className="h-3.5 w-4/5 rounded bg-[#e5e7eb]" />
      </div>
      <div className="h-[220px] border-y border-[#e5e7eb] bg-[#f3f4f6]" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-24 rounded bg-[#e5e7eb]" />
        <div className="h-3 w-16 rounded bg-[#e5e7eb]" />
      </div>
    </div>
  );
}
