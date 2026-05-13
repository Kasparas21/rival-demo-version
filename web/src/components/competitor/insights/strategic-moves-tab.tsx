"use client";

import { useEffect, useState } from "react";

import { StrategicMoveDetectorPanel } from "@/components/comparison/panels/strategic-move-detector-panel";
import type { ComparisonPayloadJson } from "@/lib/comparison/comparison-payload-types";

type Props = {
  competitorDomain: string;
  workspaceName: string;
  competitorLabel: string;
  workspaceDomain: string;
};

export function StrategicMovesTab({
  competitorDomain,
  workspaceName,
  competitorLabel,
  workspaceDomain,
}: Props) {
  const [data, setData] = useState<ComparisonPayloadJson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/comparison/payload?competitorDomain=${encodeURIComponent(competitorDomain)}`,
          { credentials: "include" },
        );
        const json = (await res.json()) as ComparisonPayloadJson;
        if (!cancelled) {
          setData(json);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [competitorDomain]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[13px] text-slate-500">Loading moves…</div>
      </div>
    );
  }

  if (!data?.ok || !data.workspace || !data.competitor) {
    return (
      <div className="flex items-center justify-center py-12 px-6">
        <div className="text-center text-[13px] text-slate-500">
          {data?.error ?? "Could not load move data. Confirm workspace brand and competitor are set up."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <StrategicMoveDetectorPanel
        workspaceLabel={workspaceName}
        competitorLabel={competitorLabel}
        workspaceDomain={workspaceDomain}
        competitorDomain={competitorDomain}
        workspaceMoves={data.workspace.recent_moves}
        competitorMoves={data.competitor.recent_moves}
        workspaceSnapshotCount={data.workspace.snapshot_count}
        competitorSnapshotCount={data.competitor.snapshot_count}
        standaloneMode
      />
    </div>
  );
}
