"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ActivityPulseBar } from "@/components/competitor/insights/activity-pulse-bar";
import {
  MoveFiltersBar,
  moveIsBrandBidNoise,
  type MoveFilterCategory,
} from "@/components/competitor/insights/move-filters";
import { groupMovesByRecency, MoveCard } from "@/components/competitor/insights/move-card";
import { FeatureSectionHeader } from "@/components/dashboard/feature-section-header";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";
import type { ComparisonPayloadJson } from "@/lib/comparison/comparison-payload-types";
import type { ComparisonMoveRow } from "@/lib/comparison/comparison-move-types";

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
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / (86400 * 7))}w ago`;
}

type Props = {
  competitorLabel: string;
  competitorDomain: string;
  competitorId: string;
  comparisonPayload: ComparisonPayloadJson | null;
  comparisonPayloadLoading: boolean;
  comparisonPayloadError: string | null;
  refetchComparisonPayload?: () => void | Promise<void>;
};

export function ActivityFeedTab({
  competitorLabel,
  competitorDomain,
  competitorId,
  comparisonPayload,
  comparisonPayloadLoading,
  comparisonPayloadError,
  refetchComparisonPayload,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const [moves, setMoves] = useState<ComparisonMoveRow[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [earlierOpen, setEarlierOpen] = useState(false);
  const [recomputeRunning, setRecomputeRunning] = useState(false);

  const [filter, setFilter] = useState<MoveFilterCategory>("all");
  const [significanceHighOnly, setSignificanceHighOnly] = useState(false);
  const [hideBrandBids, setHideBrandBids] = useState(true);

  const data = comparisonPayload;
  const side = data?.ok ? data.competitor : null;
  const snapshotCount = side?.snapshot_count ?? 0;
  const brandName = side?.meta.name ?? competitorLabel;
  const waitingForSnapshots = snapshotCount < 2;

  useEffect(() => {
    void refetchComparisonPayload?.();
  }, [competitorDomain, refetchComparisonPayload]);

  useEffect(() => {
    const d = competitorDomain.trim().toLowerCase();
    if (!d) return;

    let cancelled = false;
    const pollStatus = async () => {
      try {
        const st = await fetch(
          `/api/strategy-overview/recompute-status?competitorDomain=${encodeURIComponent(d)}`,
          { credentials: "include" }
        );
        const sj = (await st.json()) as { ok?: boolean; status?: string };
        if (cancelled || !sj.ok) return;
        const running = sj.status === "running";
        setRecomputeRunning(running);
        if (!running) {
          void refetchComparisonPayload?.();
        }
      } catch {
        /* ignore */
      }
    };

    void pollStatus();
    const id = window.setInterval(() => void pollStatus(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [competitorDomain, refetchComparisonPayload]);

  const bootstrapKeyRef = useRef<string | null>(null);

  const triggerRecompute = useCallback(async (opts?: { force?: boolean }) => {
    const d = competitorDomain.trim();
    if (!d) return;
    try {
      const st = await fetch(
        `/api/strategy-overview/recompute-status?competitorDomain=${encodeURIComponent(d)}`,
        { credentials: "include" }
      );
      const sj = (await st.json()) as { ok?: boolean; status?: string };
      if (sj.ok && sj.status === "running" && !opts?.force) return;

      await fetch(`/api/strategy-overview/compiled?competitorDomain=${encodeURIComponent(d)}`, {
        credentials: "include",
      });
      await fetch("/api/strategy-overview/recompute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorDomain: d, force: opts?.force === true }),
        credentials: "include",
      });
    } catch {
      /* polling will retry */
    }
  }, [competitorDomain]);

  useEffect(() => {
    bootstrapKeyRef.current = null;
  }, [competitorDomain]);

  useEffect(() => {
    if (comparisonPayloadLoading || !waitingForSnapshots) return;
    const key = competitorDomain.trim().toLowerCase();
    if (!key) return;
    if (bootstrapKeyRef.current === key) return;
    if (recomputeRunning) return;
    bootstrapKeyRef.current = key;

    void triggerRecompute();
  }, [
    comparisonPayloadLoading,
    waitingForSnapshots,
    competitorDomain,
    triggerRecompute,
    recomputeRunning,
  ]);

  useEffect(() => {
    if (side?.recent_moves) {
      setMoves(side.recent_moves);
    } else {
      setMoves([]);
    }
  }, [side?.recent_moves]);

  const loadMore = useCallback(async () => {
    const d = competitorDomain.trim();
    if (!d || loadingMore) return;
    setLoadingMore(true);
    try {
      const u = new URL("/api/competitor/moves", window.location.origin);
      u.searchParams.set("competitorDomain", d);
      u.searchParams.set("limit", "40");
      u.searchParams.set("offset", String(moves.length));
      const res = await fetch(u.toString(), { credentials: "include" });
      const json = (await res.json()) as { ok?: boolean; moves?: ComparisonMoveRow[] };
      if (json.ok && json.moves?.length) {
        setMoves((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          const next = [...prev];
          for (const m of json.moves!) {
            if (!seen.has(m.id)) {
              seen.add(m.id);
              next.push(m);
            }
          }
          return next;
        });
      }
    } finally {
      setLoadingMore(false);
    }
  }, [competitorDomain, loadingMore, moves.length]);

  const angleActive = useCallback(
    (angle: string) => {
      const angles = side?.payload?.insights?.angle_clustering?.angles ?? [];
      return angles.some((a) => a.angle === angle);
    },
    [side?.payload?.insights?.angle_clustering?.angles]
  );

  const filteredMoves = useMemo(() => {
    let list = [...moves].sort((a, b) => Date.parse(b.detected_at) - Date.parse(a.detected_at));
    list = list.filter((m) => categoryForFilter(m, filter));
    if (significanceHighOnly) list = list.filter((m) => m.significance === "high");
    if (hideBrandBids && brandName) {
      list = list.filter((m) => !moveIsBrandBidNoise(m, brandName));
    }
    return list;
  }, [moves, filter, significanceHighOnly, hideBrandBids, brandName]);

  const { thisWeek, lastWeek, earlier } = useMemo(() => groupMovesByRecency(filteredMoves), [filteredMoves]);

  const lastAnalyzed = side?.meta.lastMoveDetectionAt ?? null;
  const cooldownRemaining =
    lastAnalyzed && Number.isFinite(Date.parse(lastAnalyzed))
      ? Math.max(0, COOLDOWN_MS - (Date.now() - Date.parse(lastAnalyzed)))
      : 0;

  const showInitialLoad = comparisonPayloadLoading && !data?.ok;
  const showRecomputeSpinner = recomputeRunning && waitingForSnapshots;

  if (showInitialLoad || showRecomputeSpinner) {
    return <RivalLoadingBlock padded className="mx-auto max-w-3xl py-16" />;
  }

  if (waitingForSnapshots) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <FeatureSectionHeader
          overline="Activity feed"
          title={<>What&apos;s changed about how {competitorLabel} advertises</>}
          description="Strategy snapshots are building — move detection needs at least two saved snapshots to compare."
        />
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-800">
            {snapshotCount === 0 ? "First snapshot pending" : "One snapshot saved"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {snapshotCount === 0
              ? "Run a strategy recompute once enrichment finishes. After a second scrape or recompute, strategic moves will appear here."
              : "Come back after the next scrape or manual recompute — we compare snapshots to detect angle, platform, and budget shifts."}
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Snapshots stored: {snapshotCount} / 2 minimum
          </p>
        </div>
      </div>
    );
  }

  if (comparisonPayloadError) {
    return (
      <div className="flex items-center justify-center py-12 px-6">
        <div className="text-center text-[13px] text-red-700">{comparisonPayloadError}</div>
      </div>
    );
  }

  if (!data?.ok || !side) {
    return (
      <div className="flex items-center justify-center py-12 px-6">
        <div className="text-center text-[13px] text-slate-500">
          {data?.error ?? "Could not load activity feed. Confirm workspace brand and competitor are set up."}
        </div>
      </div>
    );
  }

  const noMovesTotal = moves.length === 0;
  const allFilteredOut = !noMovesTotal && filteredMoves.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <FeatureSectionHeader
        overline="Activity feed"
        title={<>What&apos;s changed about how {competitorLabel} advertises</>}
        description={
          <>
            Last analyzed: {fmtRelative(lastAnalyzed)} · {snapshotCount} snapshots stored
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

      {!noMovesTotal ? <ActivityPulseBar moves={moves} /> : null}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <MoveFiltersBar
          moves={moves}
          filter={filter}
          onFilterChange={setFilter}
          significanceHighOnly={significanceHighOnly}
          onSignificanceChange={setSignificanceHighOnly}
          hideBrandBids={hideBrandBids}
          onHideBrandBidsChange={setHideBrandBids}
          brandName={brandName}
        />
      </div>

      {noMovesTotal ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-800">Move tracking is active</p>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            New changes will appear after future scrapes show a measurable difference between snapshots.
          </p>
        </div>
      ) : allFilteredOut ? (
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
                    {grp.items.map((m, i) => {
                      const ang =
                        m.event_type === "new_angle" || m.event_type === "angle_migration"
                          ? String((m.after_state as { angle?: string }).angle ?? "").trim()
                          : "";
                      return (
                        <MoveCard
                          key={m.id}
                          move={m}
                          index={i}
                          competitorId={competitorId}
                          brandName={brandName}
                          pathname={pathname}
                          searchParamsString={searchParamsString}
                          angleStillActive={ang ? angleActive(ang) : true}
                        />
                      );
                    })}
                  </div>
                </section>
              ) : null
          )}

          {earlier.length ? (
            <section>
              <button
                type="button"
                onClick={() => {
                  if (!earlierOpen) {
                    setEarlierOpen(true);
                    void loadMore();
                  } else {
                    setEarlierOpen(false);
                  }
                }}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100/80"
              >
                <span>Earlier ({earlier.length}+)</span>
                <span className="tabular-nums text-slate-400">{earlierOpen ? "−" : "+"}</span>
              </button>
              {earlierOpen ? (
                <div className="mt-3 space-y-3">
                  {earlier.map((m, i) => {
                    const ang =
                      m.event_type === "new_angle" || m.event_type === "angle_migration"
                        ? String((m.after_state as { angle?: string }).angle ?? "").trim()
                        : "";
                    return (
                      <MoveCard
                        key={m.id}
                        move={m}
                        index={i}
                        competitorId={competitorId}
                        brandName={brandName}
                        pathname={pathname}
                        searchParamsString={searchParamsString}
                        angleStillActive={ang ? angleActive(ang) : true}
                      />
                    );
                  })}
                  {loadingMore ? (
                    <p className="text-center text-[11px] text-slate-500">Loading…</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void loadMore()}
                      className="w-full rounded-lg border border-slate-200 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Load more
                    </button>
                  )}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
