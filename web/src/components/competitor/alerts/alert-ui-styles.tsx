import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Soft indigo pill — matches the “NEW” accent badge in product mocks. */
export const alertAccentBadgeClass =
  "inline-flex shrink-0 items-center justify-center rounded-full bg-[#E8EEF9] px-2 py-[3px] text-[10px] font-bold leading-none tracking-[0.06em] text-[#3B5BDB] ring-1 ring-indigo-200/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]";

export function AlertAccentBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn(alertAccentBadgeClass, className)}>{children}</span>;
}

export function AlertUnreadCountBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const label = count > 99 ? "99+" : String(count);
  return (
    <AlertAccentBadge className={cn("min-w-[1.625rem] px-2 tabular-nums tracking-normal", className)}>
      {label}
    </AlertAccentBadge>
  );
}

export const alertGlassShellClass =
  "relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/35 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_16px_48px_-20px_rgba(74,127,165,0.22)] backdrop-blur-2xl backdrop-saturate-[1.4] ring-1 ring-white/45";

export const alertGlassPanelClass =
  "rounded-2xl border border-white/65 bg-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_32px_-12px_rgba(74,127,165,0.16)] backdrop-blur-xl backdrop-saturate-[1.35] ring-1 ring-white/50";

export const alertGlassCardClass =
  "rounded-2xl border border-white/70 bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_24px_-8px_rgba(74,127,165,0.12)] backdrop-blur-lg backdrop-saturate-[1.2] ring-1 ring-white/55 transition-all duration-200 hover:bg-white/62 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_12px_40px_-12px_rgba(74,127,165,0.2)]";

export const alertGlassCardUnreadClass =
  "rounded-2xl border border-indigo-200/55 bg-gradient-to-br from-indigo-50/75 via-white/55 to-sky-50/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_28px_-10px_rgba(99,102,241,0.18)] backdrop-blur-lg backdrop-saturate-[1.25] ring-1 ring-indigo-100/60 transition-all duration-200 hover:from-indigo-50/85 hover:via-white/65 hover:to-sky-50/55";

export const alertGlassButtonClass =
  "rounded-xl border border-white/70 bg-white/45 px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_2px_12px_-4px_rgba(74,127,165,0.12)] backdrop-blur-md transition hover:bg-white/60 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_20px_-6px_rgba(74,127,165,0.18)]";

export const alertGlassChipBaseClass =
  "rounded-full px-3 py-1 text-[11px] font-semibold border transition-all duration-200";

export const alertGlassChipInactiveClass =
  "border-white/70 bg-white/40 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-md hover:bg-white/55";

export const alertGlassChipActiveClass =
  "border-slate-900/90 bg-slate-900 text-white shadow-[0_4px_14px_-4px_rgba(15,23,42,0.35)]";
