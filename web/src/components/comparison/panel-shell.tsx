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
    <div className="flex flex-col">
      <div className="mb-3 flex items-start justify-between gap-2">
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
