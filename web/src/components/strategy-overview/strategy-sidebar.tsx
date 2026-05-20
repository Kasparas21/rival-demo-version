"use client";

import type { StrategyMapPayload } from "@/lib/strategy-overview/payload-types";
import { normalizeStrategyMapPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import { ActivityScorePanel } from "@/components/competitor/activity-score-panel";
import { BarChart3, Sparkles, Video, Users } from "lucide-react";

type Props = {
  map: StrategyMapPayload;
  dimmed?: boolean;
  /** Saved competitor row id for activity score API; omit on legacy callers without DB id. */
  competitorId?: string;
  cacheDomainNorm: string;
  lastScrapedAt?: string | null;
  onFreshnessRescrape?: () => void;
};

const CARD =
  "rounded-xl border border-[0.5px] border-slate-200/90 bg-white/90 p-3 shadow-sm min-w-0";

export function StrategyOverviewSidebar({
  map,
  dimmed,
  competitorId,
  cacheDomainNorm,
  lastScrapedAt = null,
  onFreshnessRescrape,
}: Props) {
  const m = normalizeStrategyMapPayload(map);
  const signals = m.audienceSignals;
  const interestLabels = Array.isArray(signals?.interests) ? signals.interests : [];
  const dominantFormat = m.dominantFormat ?? { format: "—", percentage: 0 };
  const toneOfVoice = m.toneOfVoice ?? { primary: "—", attributes: [] as string[] };
  const topAngles = Array.isArray(m.topAngles) ? m.topAngles : [];

  return (
    <div
      className={`flex min-w-0 flex-col gap-2.5 transition-opacity ${dimmed ? "opacity-45 pointer-events-none" : ""}`}
    >
      {competitorId ? (
        <ActivityScorePanel
          competitorId={competitorId}
          cacheDomainNorm={cacheDomainNorm}
          enabled={!dimmed}
          lastScrapedAt={lastScrapedAt}
          onFreshnessRefresh={onFreshnessRescrape}
        />
      ) : (
        <div className={`${CARD} text-[12px] text-slate-600`}>
          Activity score needs a saved competitor record. Open this brand from your sidebar after tracking it in Rival.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <div className={CARD}>
          <div className="mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <p className="text-[11px] font-semibold leading-tight text-[#0f172a]">Audience signals</p>
          </div>
          <ul className="space-y-1.5">
            {interestLabels.slice(0, 3).map((label) => (
              <li key={label} className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-600">
                <BarChart3 className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                <span className="line-clamp-2">{label}</span>
              </li>
            ))}
            <li className="flex gap-1.5 text-[11px] text-slate-600">
              <span className="text-slate-400">○</span>
              <span className="truncate">{signals?.ageRange ?? "—"}</span>
            </li>
            <li className="flex gap-1.5 text-[11px] text-slate-600">
              <span className="text-slate-400">○</span>
              <span className="truncate">{signals?.geo ?? "—"}</span>
            </li>
          </ul>
        </div>

        <div className={CARD}>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <p className="text-[11px] font-semibold leading-tight text-[#0f172a]">Dominant format</p>
          </div>
          <p className="truncate text-[14px] font-bold capitalize text-[#0f172a]">{dominantFormat.format}</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
              style={{ width: `${dominantFormat.percentage}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-slate-500">{dominantFormat.percentage}% of ads</p>
        </div>

        <div className={CARD}>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <p className="text-[11px] font-semibold leading-tight text-[#0f172a]">Tone of voice</p>
          </div>
          <p className="line-clamp-2 text-[13px] font-bold leading-snug text-[#0f172a]">{toneOfVoice.primary}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(toneOfVoice.attributes ?? []).slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full border border-sky-100 bg-sky-50 px-1.5 py-0.5 text-[9px] font-medium text-sky-900"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className={CARD}>
          <p className="mb-1.5 text-[11px] font-semibold leading-tight text-[#0f172a]">Top creative angles</p>
          <ol className="space-y-1.5">
            {topAngles.slice(0, 3).map((a) => (
              <li key={a.rank} className="text-[11px] leading-snug text-slate-700">
                <span className="font-semibold text-slate-900">{a.rank}.</span>{" "}
                <span className="line-clamp-2">{a.angle}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
