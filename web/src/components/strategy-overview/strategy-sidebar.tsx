"use client";

import type { ReactNode } from "react";

import type { StrategyMapPayload } from "@/lib/strategy-overview/payload-types";
import { normalizeStrategyMapPayload } from "@/lib/strategy-overview/normalize-strategy-payload";
import { classifyAngleCategory, parseAngleForDisplay } from "@/lib/comparison/stealable-angle-present";
import { ActivityScorePanel } from "@/components/competitor/activity-score-panel";
import { BarChart3, Globe2, Sparkles, Target, Users, Video } from "lucide-react";

type Props = {
  map: StrategyMapPayload;
  dimmed?: boolean;
  competitorId?: string;
  cacheDomainNorm: string;
  lastScrapedAt?: string | null;
  onFreshnessRescrape?: () => void;
  activityScoreEnabled?: boolean;
  /** Static fallback when no saved competitor (e.g. landing hero demo). */
  activityScoreFallback?: ReactNode;
  /** When false, hides the 2×2 audience/format/tone/angles grid (demo strategy map). */
  showInsightCards?: boolean;
};

const CARD =
  "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] min-w-0";

const CARD_GLOW =
  "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-40 blur-2xl";

function InsightCard({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className={CARD}>
      <div className={CARD_GLOW} style={{ background: accent }} aria-hidden />
      <div className="relative">
        <div className="mb-2.5 flex items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${accent}18`, color: accent }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <p className="text-[11px] font-semibold leading-tight text-[#0f172a]">{title}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StrategyOverviewSidebar({
  map,
  dimmed,
  competitorId,
  cacheDomainNorm,
  lastScrapedAt = null,
  onFreshnessRescrape,
  activityScoreEnabled = true,
  activityScoreFallback,
  showInsightCards = true,
}: Props) {
  const m = normalizeStrategyMapPayload(map);
  const signals = m.audienceSignals;
  const interestLabels = Array.isArray(signals?.interests) ? signals.interests : [];
  const dominantFormat = m.dominantFormat ?? { format: "—", percentage: 0 };
  const toneOfVoice = m.toneOfVoice ?? { primary: "—", attributes: [] as string[] };
  const topAngles = Array.isArray(m.topAngles) ? m.topAngles : [];
  const extras = m.sidebarExtras;

  return (
    <div
      className={`flex min-w-0 flex-col gap-2.5 transition-opacity ${dimmed ? "pointer-events-none opacity-45" : ""}`}
    >
      {competitorId ? (
        <ActivityScorePanel
          competitorId={competitorId}
          cacheDomainNorm={cacheDomainNorm}
          enabled={activityScoreEnabled && !dimmed}
          lastScrapedAt={lastScrapedAt}
          onFreshnessRefresh={onFreshnessRescrape}
        />
      ) : activityScoreFallback ? (
        activityScoreFallback
      ) : (
        <div className={`${CARD} text-[12px] text-slate-600`}>
          Activity score needs a saved competitor record. Open this brand from your sidebar after tracking it in Rival.
        </div>
      )}

      {showInsightCards ? (
      <div className="grid grid-cols-2 gap-2.5">
        <InsightCard title="Audience signals" icon={Users} accent="#6366f1">
          <ul className="space-y-2">
            {interestLabels.slice(0, 3).map((label, idx) => (
              <li key={`audience-${idx}-${label.slice(0, 48)}`} className="flex items-start gap-2 rounded-lg bg-slate-50/90 px-2 py-1.5">
                <Target className="mt-0.5 h-3 w-3 shrink-0 text-indigo-500" />
                <span className="line-clamp-2 text-[10px] font-medium leading-snug text-slate-700">{label}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 border-t border-slate-100 pt-2 text-[10px] text-slate-600">
              <BarChart3 className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{signals?.ageRange ?? "—"}</span>
            </li>
            <li className="flex items-center gap-2 text-[10px] text-slate-600">
              <Globe2 className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="line-clamp-2 leading-snug">{signals?.geo ?? "—"}</span>
            </li>
          </ul>
        </InsightCard>

        <InsightCard title="Dominant format" icon={Video} accent="#0ea5e9">
          <p className="text-[15px] font-bold leading-tight text-[#0f172a]">{dominantFormat.format}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, dominantFormat.percentage))}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] font-medium text-slate-500">{dominantFormat.percentage}% of live ads</p>
          {extras?.formatMix && extras.formatMix.length > 1 ? (
            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
              {extras.formatMix.slice(1, 3).map((f) => (
                <div key={f.label} className="flex items-center justify-between gap-2 text-[9px] text-slate-500">
                  <span className="truncate">{f.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-700">{f.sharePct}%</span>
                </div>
              ))}
            </div>
          ) : null}
        </InsightCard>

        <InsightCard title="Tone of voice" icon={Sparkles} accent="#a855f7">
          <p className="line-clamp-2 text-[13px] font-bold leading-snug text-[#0f172a]">{toneOfVoice.primary}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(toneOfVoice.attributes ?? []).slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full border border-violet-100 bg-violet-50/90 px-2 py-0.5 text-[9px] font-semibold text-violet-900"
              >
                {t}
              </span>
            ))}
          </div>
          {extras?.voiceConfidence != null ? (
            <p className="mt-2 text-[9px] text-slate-500">
              Model confidence · {Math.round(extras.voiceConfidence * 100)}%
            </p>
          ) : null}
        </InsightCard>

        <InsightCard title="Top creative angles" icon={Target} accent="#10b981">
          <ol className="space-y-2">
            {topAngles.slice(0, 3).map((a) => {
              const parsed = parseAngleForDisplay(a.angle);
              const cat = classifyAngleCategory(a.angle);
              const hook = parsed.hook || a.angle;
              return (
                <li
                  key={`top-angle-${a.rank}-${a.angle.slice(0, 80)}`}
                  className="rounded-lg border border-emerald-100/80 bg-gradient-to-br from-emerald-50/50 to-white px-2 py-1.5"
                >
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
                      {a.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[10px] font-semibold leading-snug text-slate-800">{hook}</p>
                      {cat !== "other" ? (
                        <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-700/80">
                          {cat.replace(/_/g, " ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {extras?.angleCategories && extras.angleCategories.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
              {extras.angleCategories.slice(0, 3).map((c) => (
                <span
                  key={c.category}
                  className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-600"
                >
                  {c.label} {c.sharePct}%
                </span>
              ))}
            </div>
          ) : null}
        </InsightCard>
      </div>
      ) : null}
    </div>
  );
}
