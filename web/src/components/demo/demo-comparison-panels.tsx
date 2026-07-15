"use client";

import { useMemo } from "react";

import { AngleMigrationPanel } from "@/components/comparison/panels/angle-migration-panel";
import { TestingVelocityMatrixPanel } from "@/components/comparison/panels/testing-velocity-matrix-panel";
import {
  buildDemoCompetitorComparisonPayload,
  buildDemoWorkspaceComparisonPayload,
} from "@/lib/demo/demo-comparison-payload";

type Props = {
  workspaceName: string;
  competitorName: string;
  competitorId?: string;
};

export function DemoTestingVelocityPanel({ workspaceName, competitorName }: Props) {
  const left = useMemo(
    () => ({ name: workspaceName, payload: buildDemoWorkspaceComparisonPayload(workspaceName) }),
    [workspaceName],
  );
  const right = useMemo(
    () => ({ name: competitorName, payload: buildDemoCompetitorComparisonPayload(competitorName) }),
    [competitorName],
  );

  return (
    <div id="comparison-velocity" className="scroll-mt-36">
      <TestingVelocityMatrixPanel left={left} right={right} />
    </div>
  );
}

export function DemoAngleMigrationPanel({
  workspaceName,
  competitorName,
  competitorId = "demo-competitor-a",
}: Props) {
  const workspace = useMemo(
    () => ({ name: workspaceName, payload: buildDemoWorkspaceComparisonPayload(workspaceName) }),
    [workspaceName],
  );
  const competitor = useMemo(
    () => ({ name: competitorName, payload: buildDemoCompetitorComparisonPayload(competitorName) }),
    [competitorName],
  );

  return (
    <div id="comparison-ad-wall" className="scroll-mt-36">
      <AngleMigrationPanel
        workspace={workspace}
        competitor={competitor}
        competitorId={competitorId}
        onOpenAd={() => {}}
        resolveVaultAds={() => []}
      />
    </div>
  );
}
