"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Sparkles } from "lucide-react";

import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";
import { ComparisonPanelShell, ComparisonInsufficient } from "@/components/comparison/panel-shell";
import { ComparisonPlatformIcon } from "@/components/comparison/platform-icon";
import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { RivalLogoVideo } from "@/components/ui/rival-loading";

type Filter = "all" | "platform" | "angles" | "budget" | "voice";

type Props = {
  workspaceLabel: string;
  competitorLabel: string;
  workspaceDomain: string;
  competitorDomain: string;
  workspaceMoves: ComparisonMoveRow[];
  competitorMoves: ComparisonMoveRow[];
  workspaceSnapshotCount: number;
  competitorSnapshotCount: number;
  /** When set, show only competitor timeline (Insights > Strategic Moves). */
  standaloneMode?: boolean;
};

function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / (86400 * 7))}w ago`;
}

function eventCategory(e: string): Filter | "other" {
  if (e === "new_platform" || e === "dropped_platform") return "platform";
  if (e === "new_angle" || e === "angle_migration") return "angles";
  if (e === "budget_shift") return "budget";
  if (e === "voice_shift") return "voice";
  return "other";
}

function iconFor(event_type: string) {
  switch (event_type) {
    case "new_platform":
      return "⭐";
    case "dropped_platform":
      return "❌";
    case "new_angle":
      return "💡";
    case "angle_migration":
      return "↗";
    case "budget_shift":
      return "💰";
    case "voice_shift":
      return "🎤";
    default:
      return "•";
  }
}

function normPlatform(p: string | null): StrategyPlatform | null {
  if (!p) return null;
  const x = p.toLowerCase();
  if (
    x === "meta" ||
    x === "google" ||
    x === "tiktok" ||
    x === "linkedin" ||
    x === "pinterest" ||
    x === "snapchat"
  )
    return x;
  return null;
}

function labelForEvent(m: ComparisonMoveRow): string {
  const pl = m.platform ? m.platform : "";
  switch (m.event_type) {
    case "new_platform":
      return `New platform: ${pl}`;
    case "dropped_platform":
      return `Dropped platform: ${pl}`;
    case "new_angle":
      return `New angle: ${(m.after_state as { angle?: string })?.angle ?? "creative angle"}`;
    case "angle_migration":
      return `Angle migration: ${(m.after_state as { angle?: string })?.angle ?? "angle"}`;
    case "budget_shift":
      return `Budget shift on ${pl}`;
    case "voice_shift":
      return `Voice shift on ${pl}`;
    default:
      return m.event_type;
  }
}

function beforeAfterSnippet(m: ComparisonMoveRow): string | null {
  const b = m.before_state as Record<string, unknown> | null;
  const a = m.after_state as Record<string, unknown> | null;
  if (!b && !a) return null;
  const parts: string[] = [];
  if (typeof b?.ad_count === "number" || typeof a?.ad_count === "number") {
    parts.push(`${b?.ad_count ?? "?"} ads → ${a?.ad_count ?? "?"} ads`);
  } else if (typeof b?.pct === "number" || typeof a?.pct === "number") {
    parts.push(`${b?.pct ?? "?"}% → ${a?.pct ?? "?"}%`);
  } else if (m.platform) {
    parts.push("State updated — see narrative");
  }
  return parts.length ? parts.join(" · ") : null;
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All moves" },
  { id: "platform", label: "Platform changes" },
  { id: "angles", label: "New angles" },
  { id: "budget", label: "Budget shifts" },
  { id: "voice", label: "Voice shifts" },
];

function filteredEmptyMessage(filter: Filter, competitorMoveTotal: number): string {
  const kind =
    filter === "platform"
      ? "platform changes"
      : filter === "angles"
        ? "new or migrated angles"
        : filter === "budget"
          ? "budget shifts"
          : "voice shifts";
  const hint =
    competitorMoveTotal > 0
      ? ` ${competitorMoveTotal} other moves available — try "All moves" filter.`
      : "";
  return `No ${kind} detected between snapshots.${hint}`;
}

export function StrategicMoveDetectorPanel({
  workspaceLabel,
  competitorLabel,
  workspaceDomain,
  competitorDomain,
  workspaceMoves,
  competitorMoves,
  workspaceSnapshotCount,
  competitorSnapshotCount,
  standaloneMode = false,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [triggering, setTriggering] = useState<"ws" | "rival" | null>(null);

  const mergedCompetitor = useMemo(() => {
    return competitorMoves.filter((m) => filter === "all" || eventCategory(m.event_type) === filter);
  }, [competitorMoves, filter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: competitorMoves.length,
      platform: 0,
      angles: 0,
      budget: 0,
      voice: 0,
      other: 0,
    };
    for (const m of competitorMoves) {
      const cat = eventCategory(m.event_type);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [competitorMoves]);

  const lowSnapshots = standaloneMode
    ? competitorSnapshotCount < 2
    : workspaceSnapshotCount < 2 || competitorSnapshotCount < 2;

  const weakerSide = useMemo(() => {
    if (standaloneMode) {
      return { name: competitorLabel, domain: competitorDomain, count: competitorSnapshotCount };
    }
    if (workspaceSnapshotCount <= competitorSnapshotCount) {
      return { name: workspaceLabel, domain: workspaceDomain, count: workspaceSnapshotCount };
    }
    return { name: competitorLabel, domain: competitorDomain, count: competitorSnapshotCount };
  }, [
    standaloneMode,
    workspaceSnapshotCount,
    competitorSnapshotCount,
    workspaceLabel,
    competitorLabel,
    workspaceDomain,
    competitorDomain,
  ]);

  const triggerRecompute = async (domain: string) => {
    const d = domain.trim();
    if (!d) return;
    setTriggering(!standaloneMode && domain === workspaceDomain ? "ws" : "rival");
    try {
      await fetch(
        `/api/strategy-overview/compiled?competitorDomain=${encodeURIComponent(d)}&force=1`,
        { credentials: "include" }
      );
    } finally {
      setTriggering(null);
    }
  };

  const timelineMoves = useMemo(() => {
    return [...competitorMoves].sort((a, b) => Date.parse(b.detected_at) - Date.parse(a.detected_at));
  }, [competitorMoves]);

  if (lowSnapshots) {
    return (
      <ComparisonPanelShell
        title="Strategic move detector"
        subtitle="Changes inferred from the last two strategy snapshots per brand"
        tooltip="Runs at most once per 24h per brand when you open Comparison."
      >
        <div className="flex flex-col items-center text-center gap-3 py-4 px-2">
          <AlertCircle className="h-8 w-8 text-amber-500" aria-hidden />
          <div>
            <p className="text-[14px] font-semibold text-slate-900 tracking-tight">Move tracking activates after two scrapes</p>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed max-w-md mx-auto">
              {standaloneMode ? (
                <>
                  Currently {competitorSnapshotCount} snapshot(s) of {competitorLabel}. Trigger another full recompute,
                  wait for it to finish, then repeat so at least 2 snapshots exist for move detection.
                </>
              ) : (
                <>
                  Currently {workspaceSnapshotCount} snapshot(s) of {workspaceLabel} and {competitorSnapshotCount} of{" "}
                  {competitorLabel}. Trigger another full recompute on the brand with fewer snapshots, wait for it to
                  finish, then repeat so each side has at least 2 snapshots.
                </>
              )}
            </p>
          </div>
          {weakerSide.domain ? (
            <button
              type="button"
              disabled={triggering !== null}
              onClick={() => void triggerRecompute(weakerSide.domain)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-4 py-2 text-[11px] font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              {triggering ? (
                <span className="inline-flex rounded-md border border-white/15 bg-white/10 p-[3px] ring-1 ring-white/15">
                  <RivalLogoVideo size="inline" />
                </span>
              ) : null}
              Trigger recompute on {weakerSide.name}
            </button>
          ) : null}
        </div>
      </ComparisonPanelShell>
    );
  }

  if (!standaloneMode && competitorMoves.length === 0 && workspaceMoves.length === 0) {
    return (
      <ComparisonPanelShell
        title="Strategic move detector"
        subtitle="Changes inferred from the last two strategy snapshots per brand"
        tooltip="Runs at most once per 24h per brand when you open Comparison."
      >
        <div className="py-6 text-center text-[12px] text-slate-600 leading-relaxed max-w-lg mx-auto">
          No significant changes detected between snapshots. Move detection runs at most once per 24 hours when you open
          this page.
        </div>
      </ComparisonPanelShell>
    );
  }

  return (
    <ComparisonPanelShell
      title="Strategic move detector"
      subtitle={
        standaloneMode
          ? `Changes inferred from strategy snapshots for ${competitorLabel}`
          : "Changes inferred from the last two strategy snapshots per brand"
      }
      tooltip="High-significance moves get a short Sonnet narrative."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium border transition-colors ${
                filter === f.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white/70 text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
              {categoryCounts[f.id] > 0 ? (
                <span className="opacity-70 ml-1 tabular-nums">({categoryCounts[f.id]})</span>
              ) : null}
            </button>
          ))}
        </div>

        {!standaloneMode ? (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{workspaceLabel} — recent</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {workspaceMoves.slice(0, 5).length === 0 ? (
              <span className="text-[11px] text-slate-500">No moves recorded for your brand yet.</span>
            ) : (
              workspaceMoves.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="shrink-0 rounded-xl border border-slate-200/90 bg-white/70 px-3 py-2 text-[10px] text-slate-800 max-w-[200px]"
                >
                  <span className="mr-1">{iconFor(m.event_type)}</span>
                  {labelForEvent(m)}
                </div>
              ))
            )}
          </div>
        </div>
        ) : null}

        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{competitorLabel} — timeline</p>
          {competitorMoves.length === 0 ? (
            <p className="text-[11px] text-slate-500 py-2">
              No moves recorded for {competitorLabel} between the latest snapshots.
            </p>
          ) : mergedCompetitor.length === 0 ? (
            <ComparisonInsufficient message={filteredEmptyMessage(filter, competitorMoves.length)} />
          ) : (
            <div className="relative pl-14">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />
              <ul className="space-y-6">
                {timelineMoves
                  .filter((m) => filter === "all" || eventCategory(m.event_type) === filter)
                  .map((m, idx) => {
                    const pl = normPlatform(m.platform);
                    const sigDot =
                      m.significance === "high"
                        ? "bg-red-500"
                        : m.significance === "medium"
                          ? "bg-amber-400"
                          : "bg-sky-500";
                    const ba = beforeAfterSnippet(m);
                    const alignRight = idx % 2 === 0;
                    return (
                      <li key={m.id} className="relative">
                        <span className="absolute left-0 w-12 text-[9px] text-slate-500 text-right pr-2 top-3 tabular-nums">
                          {relativeTime(m.detected_at)}
                        </span>
                        <span
                          className={`absolute left-[1.4rem] top-4 h-2.5 w-2.5 rounded-full border-2 border-white z-10 ${sigDot}`}
                        />
                        <div className={`ml-4 ${alignRight ? "mr-0 md:ml-8" : "md:mr-8"}`}>
                          <div className="rounded-xl border border-slate-200/90 bg-white/80 p-3 shadow-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base leading-none">{iconFor(m.event_type)}</span>
                              <span className="font-semibold text-slate-900 text-[12px]">{labelForEvent(m)}</span>
                              {pl ? <ComparisonPlatformIcon platform={pl} className="h-4 w-4" /> : null}
                            </div>
                            {ba ? (
                              <p className="text-[10px] text-slate-600 mt-1.5 font-mono tabular-nums">{ba}</p>
                            ) : null}
                            {m.narrative ? (
                              <p className="mt-2 text-[11px] text-slate-600 leading-snug italic flex gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 shrink-0 text-sky-600 mt-0.5" />
                                {m.narrative}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </ComparisonPanelShell>
  );
}
