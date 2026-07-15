"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ActivityPulseBar } from "@/components/competitor/insights/activity-pulse-bar";
import {
  groupMovesByRecency,
  MoveCard,
} from "@/components/competitor/insights/move-card";
import {
  moveIsBrandBidNoise,
  MoveFiltersBar,
  type MoveFilterCategory,
} from "@/components/competitor/insights/move-filters";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";
import {
  buildDemoActivityFeedMoves,
  DEMO_ACTIVITY_LAST_ANALYZED_ISO,
  DEMO_ACTIVITY_SNAPSHOT_COUNT,
} from "@/lib/demo/demo-activity-feed-payload";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function categoryForFilter(m: ComparisonMoveRow, f: MoveFilterCategory): boolean {
  if (f === "all") return true;
  if (f === "angles") return m.event_type === "new_angle" || m.event_type === "angle_migration";
  if (f === "platform") return m.event_type === "new_platform" || m.event_type === "dropped_platform";
  if (f === "budget") return m.event_type === "budget_shift";
  if (f === "voice") return m.event_type === "voice_shift";
  return false;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / (86400 * 7))}w ago`;
}

type Props = {
  competitorLabel: string;
  competitorId?: string;
};

export function DemoActivityFeedTab({
  competitorLabel,
  competitorId = "demo-competitor-a",
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const moves = useMemo(() => buildDemoActivityFeedMoves(), []);
  const [filter, setFilter] = useState<MoveFilterCategory>("all");
  const [significanceHighOnly, setSignificanceHighOnly] = useState(false);
  const [hideBrandBids, setHideBrandBids] = useState(true);
  const [earlierOpen, setEarlierOpen] = useState(false);

  const filteredMoves = useMemo(() => {
    let list = [...moves].sort((a, b) => Date.parse(b.detected_at) - Date.parse(a.detected_at));
    list = list.filter((m) => categoryForFilter(m, filter));
    if (significanceHighOnly) list = list.filter((m) => m.significance === "high");
    if (hideBrandBids && competitorLabel) {
      list = list.filter((m) => !moveIsBrandBidNoise(m, competitorLabel));
    }
    return list;
  }, [moves, filter, significanceHighOnly, hideBrandBids, competitorLabel]);

  const { thisWeek, lastWeek, earlier } = useMemo(
    () => groupMovesByRecency(filteredMoves),
    [filteredMoves],
  );

  const lastAnalyzed = DEMO_ACTIVITY_LAST_ANALYZED_ISO;
  const cooldownRemaining =
    lastAnalyzed && Number.isFinite(Date.parse(lastAnalyzed))
      ? Math.max(0, COOLDOWN_MS - (Date.now() - Date.parse(lastAnalyzed)))
      : 0;

  const allFilteredOut = moves.length > 0 && filteredMoves.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <FeatureSectionHeader
        overline="Activity feed"
        title={<>What&apos;s changed about how {competitorLabel} advertises</>}
        description={
          <>
            Last analyzed: {fmtRelative(lastAnalyzed)} · {DEMO_ACTIVITY_SNAPSHOT_COUNT} snapshots stored
          </>
        }
        note={
          <>
            Moves come from <strong className="font-medium text-slate-600">differences between strategy snapshots</strong>{" "}
            (not the same as individual ad launch dates on the Timeline tab).
          </>
        }
      />

      {cooldownRemaining > 0 && cooldownRemaining < COOLDOWN_MS ? (
        <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50/90 px-3 py-2 text-[11px] text-sky-900">
          Next automatic snapshot diff in about {Math.ceil(cooldownRemaining / 3_600_000)}h (runs when Comparison or
          this page loads the latest payload).
        </div>
      ) : null}

      <ActivityPulseBar moves={moves} />

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <MoveFiltersBar
          moves={moves}
          filter={filter}
          onFilterChange={setFilter}
          significanceHighOnly={significanceHighOnly}
          onSignificanceChange={setSignificanceHighOnly}
          hideBrandBids={hideBrandBids}
          onHideBrandBidsChange={setHideBrandBids}
          brandName={competitorLabel}
        />
      </div>

      {allFilteredOut ? (
        <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50/80 px-5 py-8 text-center text-sm text-slate-700">
          <p>No moves match your filters.</p>
          <button
            type="button"
            className="mt-3 text-[11px] font-semibold text-sky-700 underline"
            onClick={() => {
              setHideBrandBids(false);
              setSignificanceHighOnly(false);
              setFilter("all");
            }}
          >
            Show brand bids &amp; all significance
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {thisWeek.length === 0 && lastWeek.length === 0 && earlier.length > 0 && !earlierOpen ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
              All {earlier.length} matching move{earlier.length === 1 ? "" : "s"} are older than 14 days — expand{" "}
              <span className="font-medium">Earlier</span> to review.
            </p>
          ) : null}

          {[{ key: "tw", label: "This week", items: thisWeek }, { key: "lw", label: "Last week", items: lastWeek }].map(
            (grp) =>
              grp.items.length ? (
                <section key={grp.key}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{grp.label}</p>
                  <div className="mt-3 space-y-3">
                    {grp.items.map((m, i) => (
                      <MoveCard
                        key={m.id}
                        move={m}
                        index={i}
                        competitorId={competitorId}
                        brandName={competitorLabel}
                        pathname={pathname}
                        searchParamsString={searchParamsString}
                        angleStillActive
                      />
                    ))}
                  </div>
                </section>
              ) : null,
          )}

          {earlier.length ? (
            <section>
              <button
                type="button"
                onClick={() => setEarlierOpen((open) => !open)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100/80"
              >
                <span>Earlier ({earlier.length}+)</span>
                <span className="tabular-nums text-slate-400">{earlierOpen ? "−" : "+"}</span>
              </button>
              {earlierOpen ? (
                <div className="mt-3 space-y-3">
                  {earlier.map((m, i) => (
                    <MoveCard
                      key={m.id}
                      move={m}
                      index={i}
                      competitorId={competitorId}
                      brandName={competitorLabel}
                      pathname={pathname}
                      searchParamsString={searchParamsString}
                      angleStillActive
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
