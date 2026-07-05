"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { Mail } from "lucide-react";

import { CHANNEL_EMAIL_THEME } from "@/lib/strategy-overview/map-node-sizing";

export type EmailChannelNodeData = {
  label: string;
  emailCount: number;
  emailsPerWeek: number;
  dominantType: string | null;
  dominantAngle: string | null;
  offerSharePct: number;
  espDetected: string | null;
};

const theme = CHANNEL_EMAIL_THEME;
const handleClass =
  "!h-3 !w-3 !border-2 !border-white !bg-amber-500 !opacity-100 pointer-events-none";

function formatTypeLabel(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/_/g, " ");
}

function EmailChannelNodeInner({ data, selected }: NodeProps) {
  const d = data as EmailChannelNodeData;
  const typeLabel = formatTypeLabel(d.dominantType);
  const esp =
    d.espDetected && d.espDetected !== "unknown" ? d.espDetected : null;

  return (
    <div
      className={`relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl px-3.5 py-2.5 transition-all duration-200 cursor-pointer ${
        selected ? "scale-[1.02] ring-2 ring-amber-300/50" : "hover:scale-[1.015]"
      }`}
      style={{
        background: theme.bg,
        borderColor: theme.border,
        borderWidth: 2,
        borderStyle: "solid",
        boxShadow: selected ? theme.glow : `0 8px 28px rgba(15, 23, 42, 0.08), ${theme.glow}`,
      }}
    >
      <Handle id="top" type="target" position={Position.Top} className={handleClass} />

      <div className="mb-1.5 flex shrink-0 items-start justify-between gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/90 text-amber-700 shadow-sm ring-1 ring-white/80">
            <Mail className="h-4 w-4" aria-hidden />
          </div>
          <span className="truncate text-[13px] font-bold text-slate-900">Email</span>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${theme.badge}`}
        >
          Capture
        </span>
      </div>

      <p className={`shrink-0 text-[20px] font-extrabold leading-none tabular-nums ${theme.metricText}`}>
        {d.emailCount}
        <span className="ml-1.5 text-[12px] font-bold text-slate-600">emails</span>
      </p>
      <p className={`mt-1 line-clamp-2 text-[10px] font-semibold leading-snug ${theme.subtle}`}>
        {d.emailsPerWeek > 0 ? `~${d.emailsPerWeek}/wk` : "—"}
        {typeLabel ? ` · ${typeLabel}` : ""}
        {d.offerSharePct >= 20 ? ` · ${d.offerSharePct}% offers` : ""}
        {esp ? ` · via ${esp}` : ""}
      </p>
    </div>
  );
}

export const EmailChannelNode = memo(EmailChannelNodeInner);
