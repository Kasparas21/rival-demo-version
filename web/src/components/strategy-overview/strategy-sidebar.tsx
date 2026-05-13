"use client";

import type { StrategyMapPayload } from "@/lib/strategy-overview/payload-types";
import { ActivityScorePanel } from "@/components/competitor/activity-score-panel";
import { BarChart3, Sparkles, Video, Users } from "lucide-react";

type Props = {
  map: StrategyMapPayload;
  dimmed?: boolean;
  /** Saved competitor row id for activity score API; omit on legacy callers without DB id. */
  competitorId?: string;
};

export function StrategyOverviewSidebar({ map, dimmed, competitorId }: Props) {
  return (
    <div
      className={`flex flex-col gap-3 min-w-0 transition-opacity ${dimmed ? "opacity-45 pointer-events-none" : ""}`}
    >
      {competitorId ? (
        <ActivityScorePanel competitorId={competitorId} enabled={!dimmed} />
      ) : (
        <div className="rounded-2xl border border-[0.5px] border-slate-200/90 bg-white/90 p-4 text-[12px] text-slate-600 shadow-sm">
          Activity score needs a saved competitor record. Open this brand from your sidebar after tracking it in Rival.
        </div>
      )}

      <div className="rounded-2xl border border-[0.5px] border-slate-200/90 bg-white/90 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-slate-500" />
          <p className="text-[12px] font-semibold text-[#0f172a]">Primary audience signals</p>
        </div>
        <ul className="space-y-2">
          {map.audienceSignals.interests.slice(0, 5).map((label) => (
            <li key={label} className="flex items-start gap-2 text-[12px] text-slate-600">
              <BarChart3 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
              {label}
            </li>
          ))}
          <li className="text-[12px] text-slate-600 flex gap-2">
            <span className="text-slate-400">○</span> {map.audienceSignals.ageRange}
          </li>
          <li className="text-[12px] text-slate-600 flex gap-2">
            <span className="text-slate-400">○</span> {map.audienceSignals.geo}
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-[0.5px] border-slate-200/90 bg-white/90 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Video className="h-4 w-4 text-slate-500" />
          <p className="text-[12px] font-semibold text-[#0f172a]">Dominant creative format</p>
        </div>
        <p className="text-[15px] font-bold text-[#0f172a]">{map.dominantFormat.format}</p>
        <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
            style={{ width: `${map.dominantFormat.percentage}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-1">{map.dominantFormat.percentage}% of total ads</p>
      </div>

      <div className="rounded-2xl border border-[0.5px] border-slate-200/90 bg-white/90 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-slate-500" />
          <p className="text-[12px] font-semibold text-[#0f172a]">Tone of voice</p>
        </div>
        <p className="text-[15px] font-bold text-[#0f172a] mb-2">{map.toneOfVoice.primary}</p>
        <div className="flex flex-wrap gap-1.5">
          {map.toneOfVoice.attributes.map((t) => (
            <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-900 border border-sky-100">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[0.5px] border-slate-200/90 bg-white/90 p-4 shadow-sm">
        <p className="text-[12px] font-semibold text-[#0f172a] mb-2">Top creative angles</p>
        <ol className="space-y-2">
          {map.topAngles.map((a) => (
            <li key={a.rank} className="text-[12px] text-slate-700">
              <span className="font-semibold text-slate-900">{a.rank}.</span> {a.angle}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
