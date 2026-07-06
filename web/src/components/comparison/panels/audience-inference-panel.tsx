"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Clock, Mic, Target } from "lucide-react";

import { CompetitorLogo } from "@/components/shared/competitor-logo";
import type { AudienceSnapshotHistoryRow } from "@/lib/comparison/comparison-payload-types";
import type { AngleCardCategory } from "@/lib/comparison/stealable-angle-present";
import type { AudienceInferenceResult, AudienceInferenceSegment } from "@/lib/strategy-overview/payload-types";
import { ComparisonInsufficient, ComparisonPanelShell } from "@/components/comparison/panel-shell";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { AudienceSkeleton } from "@/components/ui/feature-skeleton";

type Side = {
  name: string;
  color?: string;
  badge?: string;
  logoUrl?: string | null;
  /** Enables Clearbit / favicon fallback chain in logos. */
  domain?: string | null;
  audience: AudienceInferenceResult | null | undefined;
};

type Props = {
  workspace: Side;
  competitor: Side;
  audienceComparisonNarrative?: string | null;
  /** Single-brand view (Audience & Copy tab): competitor card only. */
  standaloneMode?: boolean;
  /** Last N snapshots, oldest → newest */
  competitorAudienceHistory?: AudienceSnapshotHistoryRow[];
  competitorLastScrapedAt?: string | null;
  /** Active / total ad count from strategy payload (for low-data warnings). */
  competitorActiveAdCount?: number;
  competitorRecomputing?: boolean;
};

function computeAudienceOverlap(wsSegments: AudienceInferenceSegment[], compSegments: AudienceInferenceSegment[]): number {
  if (!wsSegments.length || !compSegments.length) return 0;
  const wsKeywords = new Set(wsSegments.flatMap((s) => s.name.toLowerCase().split(/\s+/).filter((k) => k.length > 3)));
  const compKeywords = new Set(compSegments.flatMap((s) => s.name.toLowerCase().split(/\s+/).filter((k) => k.length > 3)));
  const intersection = [...wsKeywords].filter((k) => compKeywords.has(k));
  if (intersection.length === 0 && wsKeywords.size && compKeywords.size) return 0.5;
  return Math.min(0.85, Math.max(0.15, intersection.length / Math.max(wsKeywords.size, compKeywords.size, 1)));
}

function signalIconForText(signal: string) {
  const t = signal.toLowerCase();
  if (/ads?\s+classified|classified as|creatives?|creative\b/.test(t)) return BarChart3;
  if (/spend|budget|%\s|percent/.test(t)) return Target;
  if (/tone|voice|language|formal|persuasive|transact/.test(t)) return Mic;
  if (/\b(days?|duration|lifespan)\b/.test(t)) return Clock;
  return BarChart3;
}

function confidenceFillClass(pct: number) {
  if (pct < 50) return "from-slate-400 to-slate-500";
  if (pct < 70) return "from-slate-500 to-slate-600";
  return "from-slate-700 to-slate-900";
}

/** v1 heuristic: map segment signals to Copy Vault query facets (Part 4). */
function inferCopyVaultFiltersFromSignals(signals: string[]): {
  angleCat?: AngleCardCategory;
  platform?: string;
  funnel?: string;
} {
  const blob = signals.join(" ").toLowerCase();
  const out: { angleCat?: AngleCardCategory; platform?: string; funnel?: string } = {};

  if (/brand|direct navigation|navigation/.test(blob)) out.angleCat = "brand";
  if (/\bgoogle\b|gads|search\b/.test(blob)) out.platform = "google";
  if (/\bmeta\b|facebook|instagram/.test(blob)) out.platform = "meta";
  if (/\btiktok\b/.test(blob)) out.platform = "tiktok";
  if (/\blinkedin\b/.test(blob)) out.platform = "linkedin";

  if (/\bbof\b|bottom|conversion|purchase intent/.test(blob)) out.funnel = "BOF";
  else if (/\bmof\b|middle|consider/.test(blob)) out.funnel = "MOF";
  else if (/\btof\b|top|awareness/.test(blob)) out.funnel = "TOF";

  return out;
}

function formatWeekLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function lastPrimarySegmentShift(history: AudienceSnapshotHistoryRow[]): {
  fromName: string;
  toName: string;
  weeksBeforeLatest: number;
} | null {
  if (history.length < 2) return null;
  let lastIdx = -1;
  for (let i = 1; i < history.length; i++) {
    if (history[i]!.primarySegmentName !== history[i - 1]!.primarySegmentName) {
      lastIdx = i;
    }
  }
  if (lastIdx < 0) return null;
  return {
    fromName: history[lastIdx - 1]!.primarySegmentName,
    toName: history[lastIdx]!.primarySegmentName,
    weeksBeforeLatest: history.length - 1 - lastIdx,
  };
}

function relativeAnalyzedLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const days = Math.max(0, Math.round((Date.now() - t) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function RichCard({ side, accent }: { side: Side; accent: string }) {
  const inf = side.audience;
  if (!inf) return null;
  const segments = Array.isArray(inf.segments) ? inf.segments : [];
  const primary = segments.find((s) => s.name === inf.primarySegmentName) ?? segments[0];
  const others = segments.filter((s) => s !== primary);
  const pct = Math.round((primary?.confidence ?? 0) * 100);

  return (
    <div
      className="rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm flex flex-col min-h-[240px]"
      style={{ borderTopWidth: 3, borderTopColor: accent }}
    >
      <div className="flex items-center gap-2 mb-3">
        <CompetitorLogo
          sources={{ primary: side.logoUrl, domain: side.domain }}
          name={side.name}
          size="sm-plus"
          shape="rounded"
          className="rounded-lg border-slate-100"
        />
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{side.name}</p>
        </div>
      </div>
      <p className="text-[15px] font-semibold leading-snug tracking-tight text-slate-900 mb-1">{primary?.name ?? inf.primarySegmentName}</p>
      <div className="mb-3">
        <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
          <span>Confidence</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${confidenceFillClass(pct)} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <ul className="space-y-1.5 text-[10px] text-slate-600 leading-snug flex-1">
        {(primary?.signals ?? []).slice(0, 4).map((s, i) => {
          const Icon = signalIconForText(s);
          return (
            <li key={i} className="flex items-start gap-2">
              <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500 mt-0.5" aria-hidden />
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

function VennOverlap({
  overlap,
  workspaceLabel,
  competitorLabel,
  wsColor,
  rivalColor,
}: {
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
          <p className="font-semibold text-slate-700">{leftU}%</p>
          <p className="opacity-80">Unique {workspaceLabel.slice(0, 12)}</p>
        </div>
        <div />
        <div>
          <p className="font-semibold text-slate-800">{rightU}%</p>
          <p className="opacity-80">Unique {competitorLabel.slice(0, 12)}</p>
        </div>
      </div>
    </div>
  );
}

function StandaloneAudienceView({
  competitor,
  audienceHistory,
  lastScrapedAt,
  activeAdCount,
}: {
  competitor: Side;
  audienceHistory: AudienceSnapshotHistoryRow[];
  lastScrapedAt: string | null | undefined;
  activeAdCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inf = competitor.audience!;
  const segments = Array.isArray(inf.segments) ? inf.segments : [];
  const primary = segments.find((s) => s.name === inf.primarySegmentName) ?? segments[0];
  const secondaries = segments.filter((s) => s !== primary);
  const primaryPct = Math.round((primary?.confidence ?? 0) * 100);
  const lowData = activeAdCount > 0 && activeAdCount < 5;
  const shift = lastPrimarySegmentShift(audienceHistory);

  const navigateVault = (signals: string[]) => {
    const f = inferCopyVaultFiltersFromSignals(signals);
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", "ads library");
    p.set("sub", "copy-vault");
    p.delete("angle");
    p.delete("anglePick");
    p.delete("angleQ");
    p.delete("angleCat");
    p.delete("platform");
    p.delete("funnel");

    if (f.platform) p.set("platform", f.platform);
    if (f.funnel) p.set("funnel", f.funnel);
    if (f.angleCat) p.set("angleCat", f.angleCat);

    router.push(`${pathname}?${p.toString()}`);
  };

  const adCountLabel = activeAdCount > 0 ? activeAdCount : "their";

  return (
    <div className="space-y-8">
      <FeatureSectionHeader
        variant="card"
        overline="Audience profile"
        title={<>Who {competitor.name} is targeting based on creative signals</>}
        description={
          <>
            Last analyzed: {relativeAnalyzedLabel(lastScrapedAt ?? null)} · Updated weekly with scrapes
          </>
        }
      />

      {lowData ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          <p className="font-medium">Limited data</p>
          <p className="mt-1 text-slate-600">
            Few active ads in library ({activeAdCount}). Segment reads will sharpen after more creatives are scraped.
          </p>
        </div>
      ) : null}

      {!segments.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
          <p className="text-sm font-medium text-slate-900">Not enough creative variation to identify distinct segments</p>
          <p className="mt-2 text-sm text-slate-600">
            This competitor may be running highly focused campaigns.{" "}
            {inf.summary?.trim() ? (
              <>
                <span className="block mt-3 text-left text-slate-700 leading-relaxed">What we still see: {inf.summary}</span>
              </>
            ) : null}
          </p>
        </div>
      ) : (
        <>
          <section
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100/40 to-white p-6 shadow-sm"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
          >
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-slate-800" />
            <div className="relative pl-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Primary segment</p>
                <div className="text-right">
                  <p className="text-base font-semibold tabular-nums text-slate-900">{primaryPct}%</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Confidence</p>
                </div>
              </div>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">Primary target</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{primary?.name ?? inf.primarySegmentName}</h3>
              {inf.summary?.trim() ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{inf.summary}</p> : null}

              <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${confidenceFillClass(primaryPct)}`}
                  style={{ width: `${primaryPct}%` }}
                />
              </div>

              <div className="mt-6 rounded-xl border border-slate-200/80 bg-white/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Signals supporting this read</p>
                <ul className="mt-3 space-y-3">
                  {(primary?.signals ?? []).map((s, i) => {
                    const Icon = signalIconForText(s);
                    return (
                      <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                        <Icon className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" aria-hidden />
                        <span>{s}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Steal this audience</p>
                <button
                  type="button"
                  onClick={() => navigateVault(primary?.signals ?? [])}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 sm:w-auto"
                >
                  View {adCountLabel} {activeAdCount > 0 ? "ads" : "copy"} in Copy Vault →
                </button>
              </div>
            </div>
          </section>

          {secondaries.length > 0 ? (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Also targeting</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {secondaries.map((seg) => {
                  const sp = Math.round(seg.confidence * 100);
                  return (
                    <div key={seg.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex justify-between gap-2">
                        <h4 className="text-base font-semibold text-slate-900">{seg.name}</h4>
                        <span className="text-xs font-semibold text-slate-600 tabular-nums">{sp}%</span>
                      </div>
                      <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${confidenceFillClass(sp)}`}
                          style={{ width: `${sp}%` }}
                        />
                      </div>
                      <ul className="mt-4 space-y-2">
                        {(Array.isArray(seg.signals) ? seg.signals : []).slice(0, 4).map((s, i) => {
                          const Icon = signalIconForText(s);
                          return (
                            <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                              <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" aria-hidden />
                              <span>{s}</span>
                            </li>
                          );
                        })}
                      </ul>
                      <button
                        type="button"
                        onClick={() => navigateVault(Array.isArray(seg.signals) ? seg.signals : [])}
                        className="mt-4 text-sm font-semibold text-slate-900 underline-offset-2 hover:underline"
                      >
                        See {activeAdCount > 0 ? `${activeAdCount} ` : ""}ads →
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      )}

      {audienceHistory.length >= 2 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Audience evolution</h3>
          <p className="mt-1 text-sm text-slate-600">How their targeting has shifted</p>
          <p className="mt-2 text-xs text-slate-500">
            Last {audienceHistory.length} snapshots · primary segment over time
          </p>
          <ol className="mt-4 space-y-2 border-l-2 border-slate-200 pl-4">
            {[...audienceHistory].reverse().map((row) => {
              const pct = Math.round(row.primaryConfidence * 100);
              return (
                <li key={row.snapshotDate} className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{formatWeekLabel(row.snapshotDate)}:</span>{" "}
                  {row.primarySegmentName}{" "}
                  <span className="text-slate-500 tabular-nums">(primary {pct}%)</span>
                </li>
              );
            })}
          </ol>
          {shift ? (
            <p className="mt-4 text-sm text-slate-800">
              <span className="font-semibold text-slate-900">Targeting shift</span>
              {shift.weeksBeforeLatest === 0
                ? ` — primary segment is now “${shift.toName}” (was “${shift.fromName}”).`
                : ` detected ~${shift.weeksBeforeLatest} snapshot${shift.weeksBeforeLatest === 1 ? "" : "s"} ago — “${shift.fromName}” → “${shift.toName}”.`}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export function AudienceInferencePanel({
  workspace,
  competitor,
  audienceComparisonNarrative,
  standaloneMode = false,
  competitorAudienceHistory = [],
  competitorLastScrapedAt = null,
  competitorActiveAdCount = 0,
  competitorRecomputing = false,
}: Props) {
  const overlap = useMemo(() => {
    if (!workspace.audience?.segments || !competitor.audience?.segments) return 0.4;
    return computeAudienceOverlap(workspace.audience.segments, competitor.audience.segments);
  }, [workspace.audience, competitor.audience]);

  const wsColor = "#475569";
  const rivalColor = "#0f172a";

  if (standaloneMode) {
    if (!competitor.audience) {
      if (competitorRecomputing) {
        return <AudienceSkeleton />;
      }
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-900">Audience analysis pending</p>
          <p className="mt-2 text-sm text-slate-600">
            Inference runs automatically after ad enrichment completes. It will appear here without any action needed.
          </p>
        </div>
      );
    }
    return (
      <StandaloneAudienceView
        competitor={competitor}
        audienceHistory={competitorAudienceHistory}
        lastScrapedAt={competitorLastScrapedAt}
        activeAdCount={competitorActiveAdCount}
      />
    );
  }

  const hasAny = Boolean(workspace.audience || competitor.audience);

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
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-sm">
            <h4 className="text-[13px] font-semibold text-slate-900 mb-1">Audience comparison</h4>
            <p className="text-[12px] text-slate-700 leading-relaxed">{audienceComparisonNarrative}</p>
          </div>
        ) : null}
      </div>
    </ComparisonPanelShell>
  );
}
