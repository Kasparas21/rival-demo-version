"use client";

import { useMemo } from "react";

import { BarChart3, Clock, Mic, Target } from "lucide-react";

import { BrandLogoThumb } from "@/components/brand-logo-thumb";
import type { AudienceInferenceResult, AudienceInferenceSegment } from "@/lib/strategy-overview/payload-types";
import { ComparisonInsufficient, ComparisonPanelShell } from "@/components/comparison/panel-shell";

type Side = {
  name: string;
  color?: string;
  badge?: string;
  logoUrl?: string | null;
  audience: AudienceInferenceResult | null | undefined;
};

type Props = {
  workspace: Side;
  competitor: Side;
  audienceComparisonNarrative?: string | null;
};

function computeAudienceOverlap(wsSegments: AudienceInferenceSegment[], compSegments: AudienceInferenceSegment[]): number {
  if (!wsSegments.length || !compSegments.length) return 0;
  const wsKeywords = new Set(wsSegments.flatMap((s) => s.name.toLowerCase().split(/\s+/).filter((k) => k.length > 3)));
  const compKeywords = new Set(compSegments.flatMap((s) => s.name.toLowerCase().split(/\s+/).filter((k) => k.length > 3)));
  const intersection = [...wsKeywords].filter((k) => compKeywords.has(k));
  if (intersection.length === 0 && wsKeywords.size && compKeywords.size) return 0.5;
  return Math.min(0.85, Math.max(0.15, intersection.length / Math.max(wsKeywords.size, compKeywords.size, 1)));
}

function AudiencePersonasIllustration({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 120 80" className="w-full max-w-[140px] mx-auto text-slate-300" aria-hidden>
      <circle cx="40" cy="28" r="12" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.35" />
      <path d="M28 48 Q40 42 52 48 L56 72 L24 72 Z" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.35" />
      <circle cx="82" cy="30" r="10" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.25" />
      <path d="M72 46 Q82 40 92 46 L96 70 L68 70 Z" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.25" />
    </svg>
  );
}

function VennOverlap({ overlap, workspaceLabel, competitorLabel, wsColor, rivalColor }: {
  overlap: number;
  workspaceLabel: string;
  competitorLabel: string;
  wsColor: string;
  rivalColor: string;
}) {
  const o = Math.round(overlap * 100);
  const rest = 100 - o;
  const leftU = Math.round(rest * 0.5);
  const rightU = rest - leftU;
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px]">
      <svg viewBox="0 0 200 140" className="w-full max-w-[220px] h-auto">
        <circle cx="78" cy="70" r="48" fill={wsColor} fillOpacity={0.28} stroke={wsColor} strokeWidth={1} strokeOpacity={0.35} />
        <circle cx="122" cy="70" r="48" fill={rivalColor} fillOpacity={0.28} stroke={rivalColor} strokeWidth={1} strokeOpacity={0.35} />
        <text x="100" y="76" textAnchor="middle" className="fill-slate-800 text-[11px] font-bold">
          {o}%
        </text>
        <text x="100" y="92" textAnchor="middle" className="fill-slate-500 text-[7px] font-sans">
          overlap
        </text>
      </svg>
      <div className="grid grid-cols-3 gap-2 w-full text-center text-[8px] text-slate-600 mt-1">
        <div>
          <p className="font-semibold text-[#3B82F6]">{leftU}%</p>
          <p className="opacity-80">Unique {workspaceLabel.slice(0, 12)}</p>
        </div>
        <div />
        <div>
          <p className="font-semibold text-[#F97316]">{rightU}%</p>
          <p className="opacity-80">Unique {competitorLabel.slice(0, 12)}</p>
        </div>
      </div>
    </div>
  );
}

function RichCard({ side, accent }: { side: Side; accent: string }) {
  const inf = side.audience;
  if (!inf) return null;
  const primary = inf.segments.find((s) => s.name === inf.primarySegmentName) ?? inf.segments[0];
  const others = inf.segments.filter((s) => s !== primary);

  const signalIcons = [BarChart3, Target, Mic, Clock];

  return (
    <div
      className="rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm flex flex-col min-h-[280px]"
      style={{ borderTopWidth: 3, borderTopColor: accent }}
    >
      <div className="flex items-center gap-2 mb-3">
        {side.logoUrl?.trim() ? (
          <BrandLogoThumb src={side.logoUrl.trim()} alt={side.name} className="h-9 w-9 rounded-lg border border-slate-100" />
        ) : (
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: accent }}
          >
            {side.badge ?? side.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{side.name}</p>
        </div>
      </div>
      <AudiencePersonasIllustration accent={accent} />
      <p className="text-[15px] font-semibold leading-snug tracking-tight text-slate-900 text-center mt-2 mb-3">
        {primary?.name ?? inf.primarySegmentName}
      </p>
      <div className="mb-3">
        <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
          <span>Confidence</span>
          <span className="tabular-nums">{Math.round((primary?.confidence ?? 0) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all"
            style={{ width: `${Math.round((primary?.confidence ?? 0) * 100)}%` }}
          />
        </div>
      </div>
      <ul className="space-y-1.5 text-[10px] text-slate-600 leading-snug flex-1">
        {(primary?.signals ?? []).slice(0, 4).map((s, i) => {
          const Icon = signalIcons[i % signalIcons.length]!;
          return (
            <li key={i} className="flex items-start gap-2">
              <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" aria-hidden />
              <span>{s}</span>
            </li>
          );
        })}
      </ul>
      {others.length > 0 ? (
        <div className="mt-3 pt-2 border-t border-slate-100">
          <p className="text-[8px] font-semibold uppercase text-slate-500 mb-1">Other segments</p>
          <div className="flex flex-wrap gap-1">
            {others.map((s) => (
              <span
                key={s.name}
                className="rounded-full px-2 py-0.5 text-[8px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
              >
                {s.name.slice(0, 28)}
                {s.name.length > 28 ? "…" : ""} · {Math.round(s.confidence * 100)}%
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AudienceInferencePanel({ workspace, competitor, audienceComparisonNarrative }: Props) {
  const hasAny = Boolean(workspace.audience || competitor.audience);
  const overlap = useMemo(() => {
    if (!workspace.audience?.segments || !competitor.audience?.segments) return 0.4;
    return computeAudienceOverlap(workspace.audience.segments, competitor.audience.segments);
  }, [workspace.audience, competitor.audience]);

  if (!hasAny) {
    return (
      <ComparisonPanelShell
        title="Audience inference"
        subtitle="Who each brand is likely speaking to — from platform mix, angles, voice, and formats"
        tooltip="Generated during strategy recompute and cached on the overview payload."
      >
        <ComparisonInsufficient message="Audience inference appears after the next strategy recompute. Click 'Refresh' above to reload once your overview has finished." />
      </ComparisonPanelShell>
    );
  }

  const wsColor = "#3B82F6";
  const rivalColor = "#F97316";

  return (
    <ComparisonPanelShell
      title="Audience inference"
      subtitle="Who each brand is likely speaking to — inferred from ads"
      tooltip="Generated by Claude Sonnet during strategy recompute and cached on the overview payload."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <RichCard side={workspace} accent={workspace.color ?? wsColor} />
          <VennOverlap
            overlap={overlap}
            workspaceLabel={workspace.name}
            competitorLabel={competitor.name}
            wsColor={wsColor}
            rivalColor={rivalColor}
          />
          <RichCard side={competitor} accent={rivalColor} />
        </div>
        {audienceComparisonNarrative?.trim() ? (
          <div className="rounded-xl border-2 border-violet-200/90 bg-gradient-to-br from-violet-50/90 to-white/80 px-4 py-3 shadow-sm">
            <h4 className="text-[13px] font-semibold text-violet-950 mb-1">Audience comparison</h4>
            <p className="text-[12px] text-violet-900 leading-relaxed">{audienceComparisonNarrative}</p>
          </div>
        ) : null}
      </div>
    </ComparisonPanelShell>
  );
}
