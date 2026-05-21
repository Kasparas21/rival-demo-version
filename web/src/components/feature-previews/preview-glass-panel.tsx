import type { ReactNode } from "react";

type PreviewGlassPanelProps = {
  label?: string;
  children: ReactNode;
  className?: string;
};

/** Frosted glass shell for interactive feature demos — use sparingly (preview panels only). */
export function PreviewGlassPanel({ label = "Interactive preview", children, className = "" }: PreviewGlassPanelProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/70 bg-white/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_20px_56px_-24px_rgba(74,127,165,0.28)] backdrop-blur-[14px] backdrop-saturate-[1.4] ring-1 ring-white/50 sm:rounded-[1.35rem] sm:p-5 ${className}`.trim()}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent sm:inset-x-5"
      />
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#4a7fa5]/80 sm:mb-4 sm:text-[11px]">
        {label}
      </p>
      {children}
    </div>
  );
}
