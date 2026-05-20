import { buildFunnelArrows } from "@/lib/strategy-overview/funnel-arrow-geometry";
import { layoutFunnelCellPositions } from "@/lib/strategy-overview/layout-funnel-cells";
import { deriveFunnelCellEdges } from "@/lib/strategy-overview/funnel-cell-edges";
import type { FunnelCellNodePayload } from "@/lib/strategy-overview/payload-types";
import { describe, expect, it } from "vitest";

function cell(
  partial: Pick<FunnelCellNodePayload, "id" | "platform" | "funnelStage" | "adCount">
): FunnelCellNodePayload {
  return {
    label: partial.platform,
    estSpendEur: 100,
    estSpendEurLow: 80,
    estSpendEurHigh: 120,
    sampleAdIds: [],
    cellConfidence: "high",
    position: { x: 0, y: 0 },
    ...partial,
  };
}

describe("buildFunnelArrows", () => {
  it("builds visible svg paths for the six-cell Google/Meta grid", () => {
    const cells = [
      cell({ id: "google:TOF", platform: "google", funnelStage: "TOF", adCount: 94 }),
      cell({ id: "meta:TOF", platform: "meta", funnelStage: "TOF", adCount: 2 }),
      cell({ id: "google:MOF", platform: "google", funnelStage: "MOF", adCount: 1 }),
      cell({ id: "meta:MOF", platform: "meta", funnelStage: "MOF", adCount: 18 }),
      cell({ id: "google:BOF", platform: "google", funnelStage: "BOF", adCount: 17 }),
      cell({ id: "meta:BOF", platform: "meta", funnelStage: "BOF", adCount: 40 }),
    ];
    const layout = layoutFunnelCellPositions(cells, 94);
    const { edges } = deriveFunnelCellEdges({
      cells,
      angleByCell: new Map(),
      enrichedCountByCell: new Map(cells.map((c) => [c.id, c.adCount])),
    });
    const arrows = buildFunnelArrows({
      edges,
      layout,
      cells: cells.map((c) => ({ id: c.id, platform: c.platform, funnelStage: c.funnelStage })),
    });

    expect(arrows.length).toBeGreaterThan(0);
    for (const a of arrows) {
      expect(a.path.startsWith("M ")).toBe(true);
      expect(a.arrowPoints.split(" ").length).toBeGreaterThanOrEqual(3);
      expect(a.fromColor).toMatch(/^#/);
      expect(a.toColor).toMatch(/^#/);
    }
  });
});
