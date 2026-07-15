"use client";

import { useMemo } from "react";

import { ThreeMovesPanel } from "@/components/comparison/panels/three-moves-panel";
import { buildDemoThreeMovesComparison } from "@/lib/demo/demo-three-moves-payload";

type Props = {
  workspaceName: string;
  competitorName: string;
};

export function DemoThreeMovesPanel({ workspaceName, competitorName }: Props) {
  const comparison = useMemo(
    () => buildDemoThreeMovesComparison(workspaceName, competitorName),
    [workspaceName, competitorName],
  );

  return (
    <ThreeMovesPanel
      headlineTitles={comparison.headlineTitles}
      moves={comparison.moves}
      isLoading={false}
      errorMessage={null}
      workspaceName={workspaceName}
      competitorName={competitorName}
    />
  );
}
