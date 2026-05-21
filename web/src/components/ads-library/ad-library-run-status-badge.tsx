"use client";

/** Green/grey dot + day count for ads library cards (Google uses days-only; Meta/TikTok pass labels). */
export function AdLibraryRunStatusBadge({
  killed,
  runDays,
  showLabel = false,
}: {
  killed: boolean;
  runDays: number;
  showLabel?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-[#6b7280]">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${killed ? "bg-[#9ca3af]" : "bg-green-500"}`}
        aria-hidden
      />
      <span className="whitespace-nowrap font-medium tabular-nums">
        {showLabel ? `${killed ? "Ended" : "Active"} ` : null}
        {runDays}D
      </span>
    </div>
  );
}
