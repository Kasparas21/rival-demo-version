"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  ExternalLink,
  ImageIcon,
  Lightbulb,
  Sparkles,
  Target,
  X,
} from "lucide-react";

import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import {
  AlignmentBar,
  ChannelPulseRow,
  ChartCard,
  ConfidenceGauge,
  DealSourceChart,
  JourneyFlowSteps,
  PathMixDonut,
  PlatformMixBars,
  ShareBarChart,
} from "@/components/strategy-overview/journey-goal-charts";
import type { JourneyIcpInsight } from "@/lib/strategy-overview/journey-goal-analytics";
import {
  computeJourneyGoalAnalytics,
  parseJourneySteps,
} from "@/lib/strategy-overview/journey-goal-analytics";
import type {
  JourneyPathIntent,
  StrategyChannelSignals,
  StrategyJourneyGoal,
} from "@/lib/strategy-overview/payload-types";

type Props = {
  open: boolean;
  goal: StrategyJourneyGoal | null;
  channelSignals?: StrategyChannelSignals | null;
  onClose: () => void;
  onOpenLandingPages?: () => void;
};

const INTENT_ACCENT: Record<JourneyPathIntent, string> = {
  direct_sale: "border-l-emerald-500",
  discount_sale: "border-l-amber-500",
  retargeting: "border-l-violet-500",
  nurture: "border-l-sky-500",
  awareness: "border-l-blue-400",
  lead_capture: "border-l-indigo-500",
};

const INSIGHT_TONE: Record<JourneyIcpInsight["tone"], string> = {
  rose: "border-rose-200/80 bg-rose-50/60",
  amber: "border-amber-200/80 bg-amber-50/60",
  emerald: "border-emerald-200/80 bg-emerald-50/60",
  violet: "border-violet-200/80 bg-violet-50/60",
  slate: "border-slate-200/80 bg-slate-50/60",
};

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-[13px] font-semibold text-slate-900">{children}</h3>
      {action}
    </div>
  );
}

function formatCategoryLabel(label: string): string {
  if (/^\d{4,}$/.test(label.trim())) return "Product / collection page";
  return label;
}

export function JourneyGoalSheet({ open, goal, channelSignals, onClose, onOpenLandingPages }: Props) {
  const analytics = useMemo(
    () => (goal ? computeJourneyGoalAnalytics(goal, channelSignals) : null),
    [goal, channelSignals],
  );

  if (!open || !goal || !analytics) return null;

  const ev = goal.evidence;
  const confidencePct = Math.round(goal.confidence * 100);
  const journeySteps = parseJourneySteps(goal.journeySummary);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal aria-labelledby="journey-goal-sheet-title">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-[#f8fafc] shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="border-b border-slate-200 bg-white px-4 py-3.5">
          <div className="flex items-start gap-3">
            <ConfidenceGauge pct={confidencePct} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                  <Target className="h-4 w-4" aria-hidden />
                </span>
                <h2 id="journey-goal-sheet-title" className="truncate text-[16px] font-semibold text-[#0f172a]">
                  Journey end goal
                </h2>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-700">
                  {goal.kind.replace("_", " ")}
                </span>
              </div>
              <p className="mt-1.5 text-[15px] font-semibold text-slate-900">{goal.label}</p>
              <p className="mt-0.5 text-[12px] text-slate-600">{goal.catalogLabel}</p>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-50">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {/* ICP insight cards */}
          {analytics.insights.length > 0 ? (
            <section>
              <div className="mb-2 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                <h3 className="text-[13px] font-semibold text-slate-900">What this means for you</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {analytics.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`rounded-xl border p-2.5 ${INSIGHT_TONE[insight.tone]}`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {insight.label}
                    </p>
                    <p className="mt-0.5 text-[12px] font-bold leading-snug text-slate-900">{insight.value}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-600">{insight.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Journey flow */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
            <SectionTitle>Conversion funnel</SectionTitle>
            <JourneyFlowSteps steps={journeySteps} />
            <p className="mt-3 text-[11px] leading-relaxed text-slate-600">{goal.macroFraming}</p>
            {ev.narrative ? (
              <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-500">
                {ev.narrative}
              </p>
            ) : null}
          </section>

          <ChannelPulseRow {...analytics.channelPulse} />

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-2">
            <ChartCard title="Path mix">
              <PathMixDonut data={analytics.pathMix} />
              <div className="mt-1 space-y-0.5">
                {analytics.pathMix.map((p) => (
                  <div key={p.key ?? p.name} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.fill }} />
                      {p.name}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-800">{p.value}%</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Direct vs supporting">
              <AlignmentBar direct={analytics.alignment.direct} supporting={analytics.alignment.supporting} />
              {analytics.platformMix.length > 0 ? (
                <div className="mt-3 border-t border-slate-100 pt-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    BOF platforms
                  </p>
                  <PlatformMixBars data={analytics.platformMix} />
                </div>
              ) : null}
            </ChartCard>
          </div>

          {analytics.destinationBars.length > 0 ? (
            <ChartCard title="Where BOF traffic lands">
              <ShareBarChart data={analytics.destinationBars} />
            </ChartCard>
          ) : null}

          {analytics.categoryBars.length > 0 ? (
            <ChartCard title="Product & category push">
              <ShareBarChart data={analytics.categoryBars} height={120} />
            </ChartCard>
          ) : null}

          {ev.deals.length > 0 ? (
            <section>
              <SectionTitle>Deals & promos</SectionTitle>
              <div className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <ul className="space-y-2">
                  {ev.deals.map((d) => (
                    <li key={`${d.source}-${d.label}`} className="flex items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 text-[12px] font-medium text-slate-800">{d.label}</p>
                      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-600">
                        {d.source === "email" ? "Email" : d.channel ?? "Ad"}
                      </span>
                    </li>
                  ))}
                </ul>
                {analytics.dealSources.length > 1 ? (
                  <div className="w-24 shrink-0">
                    <DealSourceChart data={analytics.dealSources} />
                  </div>
                ) : null}
              </div>
              {ev.emailOfferSummary ? (
                <p className="mt-2 text-[11px] text-slate-500">{ev.emailOfferSummary}</p>
              ) : null}
            </section>
          ) : null}

          {ev.topCreatives.length > 0 ? (
            <section>
              <SectionTitle>Conversion creatives</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {ev.topCreatives.map((c) => (
                  <article
                    key={c.adId}
                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
                  >
                    <div className="relative border-b border-slate-100 bg-slate-50/50 p-1.5">
                      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/80">
                        {c.imageUrl ? (
                          <div className="aspect-[4/5] w-full bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                          </div>
                        ) : (
                          <div className="flex aspect-[4/5] items-center justify-center text-slate-400">
                            <ImageIcon className="h-7 w-7" />
                          </div>
                        )}
                      </div>
                      <span className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-md bg-white/95 shadow-sm ring-1 ring-slate-200/80">
                        <ComparisonPlatformIcon platform={c.platform as never} className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="p-2.5">
                      {c.headline ? (
                        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-slate-800">
                          {c.headline}
                        </p>
                      ) : null}
                      {c.angle ? <p className="mt-1 line-clamp-1 text-[10px] text-slate-500">{c.angle}</p> : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {ev.landingPreviews.length > 0 ? (
            <section>
              <SectionTitle
                action={
                  onOpenLandingPages ? (
                    <button
                      type="button"
                      onClick={onOpenLandingPages}
                      className="flex items-center gap-0.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                    >
                      All pages
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  ) : undefined
                }
              >
                Landing page previews
              </SectionTitle>
              <ul className="space-y-2">
                {ev.landingPreviews.map((lp) => (
                  <li key={lp.url}>
                    <a
                      href={lp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-3 rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300"
                    >
                      <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200/80">
                        {lp.previewImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={lp.previewImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[12px] font-semibold text-slate-900">
                            {lp.categoryLabel ? formatCategoryLabel(lp.categoryLabel) : lp.displayUrl}
                          </p>
                          <span className="shrink-0 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-white">
                            {lp.sharePct}%
                          </span>
                        </div>
                        <p className="truncate text-[10px] text-slate-500">{lp.displayUrl}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {lp.adCount} ads
                          {lp.platforms.length > 0 ? ` · ${lp.platforms.join(", ")}` : ""}
                        </p>
                      </div>
                      <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {goal.goalEdges.length > 0 ? (
            <section>
              <SectionTitle>Channel roles</SectionTitle>
              <ul className="space-y-2">
                {goal.goalEdges.map((edge, index) => (
                  <li
                    key={`${edge.from}-${edge.kind}-${edge.pathIntent}-${index}`}
                    className={`rounded-xl border border-slate-200/90 border-l-[3px] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${INTENT_ACCENT[edge.pathIntent]}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-slate-900">{edge.pathIntentLabel}</p>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                          edge.alignment === "direct"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {edge.alignment}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-700"
                          style={{ width: `${Math.round(edge.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-slate-500">
                        {Math.round(edge.confidence * 100)}%
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{edge.reasoning}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {ev.angleHighlights.length > 0 ? (
            <section className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                <h3 className="text-[13px] font-semibold text-slate-900">BOF messaging angles</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ev.angleHighlights.map((a, i) => (
                  <span
                    key={a}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                      i === 0
                        ? "border-slate-800 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {goal.signals.length > 0 ? (
            <p className="pb-2 text-center text-[10px] text-slate-400">
              Signals: {goal.signals.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
