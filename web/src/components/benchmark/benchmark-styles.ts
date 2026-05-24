import {
  brandWorkspaceFeatureTileClass,
  brandWorkspaceLeftAccentClass,
  brandWorkspacePageBgClass,
  brandWorkspaceShellClass,
  brandWorkspaceTopSheenClass,
  brandWorkspaceWellClass,
} from "@/components/dashboard/brand-workspace-surfaces";

/** Benchmark tab — matches YOUR BRAND workspace surfaces (workspace ads / ad library). */

export const benchmarkPageBgClass = brandWorkspacePageBgClass;

export const benchmarkWorkspaceShellClass = brandWorkspaceShellClass;

export const benchmarkWorkspaceTopSheenClass = brandWorkspaceTopSheenClass;

export const benchmarkWorkspaceLeftAccentClass = brandWorkspaceLeftAccentClass;

export const benchmarkWorkspaceWellClass = brandWorkspaceWellClass;

export const benchmarkWorkspaceFeatureTileClass = brandWorkspaceFeatureTileClass;

/** @deprecated — use benchmarkWorkspaceShellClass */
export const benchmarkBrandFeatureBase = benchmarkWorkspaceShellClass;

export function benchmarkBrandFeatureClass(_tint?: string): string {
  return benchmarkWorkspaceShellClass;
}

export const benchmarkBrandFeatureWellClass = benchmarkWorkspaceWellClass;

export const benchmarkGlassKpiClass = benchmarkWorkspaceShellClass;

export const benchmarkGlassPanelClass = benchmarkWorkspaceShellClass;

export const benchmarkGlassTableClass = benchmarkWorkspaceShellClass;

export const benchmarkGlassCardClass = `${benchmarkWorkspaceShellClass} transition-all duration-300 hover:shadow-[0_14px_44px_rgba(14,116,144,0.1)]`;

export const benchmarkGlassChipClass =
  "inline-flex items-center rounded-full border border-sky-200/70 bg-white/80 px-3 py-1 text-[11px] font-semibold text-sky-900 shadow-sm";

export const benchmarkBrandYouChipClass =
  "inline-flex items-center gap-1.5 rounded-full border border-sky-300/80 bg-gradient-to-br from-sky-50/90 via-white/80 to-amber-50/50 py-1 pl-1 pr-2.5 text-[12px] font-semibold text-sky-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_14px_-6px_rgba(14,116,144,0.12)] ring-1 ring-sky-200/55";

export const benchmarkCompetitorChipClass =
  "inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 py-1 pl-1 pr-2.5 text-[12px] font-medium text-slate-800 shadow-sm";

export const benchmarkGlassIconWrapClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-100/90 to-amber-50/80 text-sky-950 shadow-sm";

export const benchmarkSectionLabelClass =
  "text-[10px] font-bold uppercase tracking-[0.08em] text-sky-800/90";

export const benchmarkAccentClass = "text-sky-700";

export const benchmarkOwnRowClass =
  "rounded-xl bg-gradient-to-r from-sky-100/70 via-sky-50/50 to-amber-50/20 ring-1 ring-sky-300/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]";

export const benchmarkCtaClass =
  "inline-flex items-center justify-center rounded-xl border border-sky-900/90 bg-sky-950 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(14,116,144,0.45)] transition hover:bg-sky-900";

export const benchmarkInsightWinClass = benchmarkWorkspaceShellClass;

export const benchmarkInsightBehindClass = benchmarkWorkspaceShellClass;

export const benchmarkInsightOppClass = benchmarkWorkspaceShellClass;

export const benchmarkAngleCardClass = `${benchmarkWorkspaceShellClass} p-3.5`;
