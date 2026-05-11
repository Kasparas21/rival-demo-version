"use client";

import { Info } from "lucide-react";

export function ComparisonPanelShell({
  title,
  subtitle,
  tooltip,
  children,
}: {
  title: string;
  subtitle?: string;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-[0.5px] border-slate-200/95 bg-white/[0.78] backdrop-blur-lg px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] flex flex-col transition-shadow hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold tracking-tight text-slate-900">{title}</p>
          {subtitle ? (
            <p className="text-[10px] text-slate-500 mt-1 leading-snug font-sans">{subtitle}</p>
          ) : null}
        </div>
        <span className="shrink-0 cursor-help text-slate-400" title={tooltip}>
          <Info className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function ComparisonInsufficient({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-6 text-center text-slate-400 text-[11px] leading-snug">
      {message}
    </div>
  );
}
