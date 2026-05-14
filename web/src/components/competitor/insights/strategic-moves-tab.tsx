"use client";

import { StrategicMoveDetectorPanel } from "@/components/comparison/panels/strategic-move-detector-panel";
import { RivalLoadingBlock } from "@/components/ui/rival-loading";
import type { ComparisonPayloadJson } from "@/lib/comparison/comparison-payload-types";

type Props = {
  competitorDomain: string;
  workspaceName: string;
  competitorLabel: string;
  workspaceDomain: string;
  comparisonPayload: ComparisonPayloadJson | null;
  comparisonPayloadLoading: boolean;
  comparisonPayloadError: string | null;
};

export function StrategicMovesTab({
  competitorDomain,
  workspaceName,
  competitorLabel,
  workspaceDomain,
  comparisonPayload,
  comparisonPayloadLoading,
  comparisonPayloadError,
}: Props) {
  if (comparisonPayloadLoading) {
    return (
      <RivalLoadingBlock
        title="Loading moves…"
        description="Reading the latest two strategy snapshots to infer what changed."
        padded
        className="mx-auto max-w-5xl py-16"
      />
    );
  }

  if (comparisonPayloadError) {
    return (
      <div className="flex items-center justify-center py-12 px-6">
        <div className="text-center text-[13px] text-red-700">{comparisonPayloadError}</div>
      </div>
    );
  }

  const data = comparisonPayload;

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
