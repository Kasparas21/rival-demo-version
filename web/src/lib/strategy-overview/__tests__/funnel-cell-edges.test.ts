import type { FunnelCellNodePayload } from "@/lib/strategy-overview/payload-types";
import { deriveFunnelCellEdges } from "@/lib/strategy-overview/funnel-cell-edges";
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

describe("deriveFunnelCellEdges", () => {
  it("connects adjacent stages on the same platform", () => {
    const cells = [
      cell({ id: "meta:TOF", platform: "meta", funnelStage: "TOF", adCount: 10 }),
      cell({ id: "meta:MOF", platform: "meta", funnelStage: "MOF", adCount: 20 }),
      cell({ id: "meta:BOF", platform: "meta", funnelStage: "BOF", adCount: 30 }),
    ];
    const { edges } = deriveFunnelCellEdges({
      cells,
      angleByCell: new Map(),
      enrichedCountByCell: new Map(cells.map((c) => [c.id, c.adCount])),
      allowCrossPlatform: false,
    });
    expect(edges.some((e) => e.from === "meta:TOF" && e.to === "meta:MOF")).toBe(true);
    expect(edges.some((e) => e.from === "meta:MOF" && e.to === "meta:BOF")).toBe(true);
  });

  it("bridges TOF to BOF when MOF column is empty", () => {
    const cells = [
      cell({ id: "google:TOF", platform: "google", funnelStage: "TOF", adCount: 105 }),
      cell({ id: "meta:BOF", platform: "meta", funnelStage: "BOF", adCount: 60 }),
    ];
    const { edges } = deriveFunnelCellEdges({
      cells,
      angleByCell: new Map(),
      enrichedCountByCell: new Map(cells.map((c) => [c.id, c.adCount])),
    });
    expect(edges.some((e) => e.from === "google:TOF" && e.to === "meta:BOF")).toBe(true);
  });

  it("links Google/Meta six-cell grid with intra-platform and cross-platform feeds", () => {
    const cells = [
      cell({ id: "google:TOF", platform: "google", funnelStage: "TOF", adCount: 94 }),
      cell({ id: "meta:TOF", platform: "meta", funnelStage: "TOF", adCount: 2 }),
      cell({ id: "google:MOF", platform: "google", funnelStage: "MOF", adCount: 1 }),
      cell({ id: "meta:MOF", platform: "meta", funnelStage: "MOF", adCount: 18 }),
      cell({ id: "google:BOF", platform: "google", funnelStage: "BOF", adCount: 17 }),
      cell({ id: "meta:BOF", platform: "meta", funnelStage: "BOF", adCount: 40 }),
    ];
    const { edges } = deriveFunnelCellEdges({
      cells,
      angleByCell: new Map(),
      enrichedCountByCell: new Map(cells.map((c) => [c.id, c.adCount])),
    });
    expect(edges.length).toBeGreaterThan(4);
    expect(edges.some((e) => e.from === "google:TOF" && e.to === "google:MOF")).toBe(true);
    expect(edges.some((e) => e.from === "meta:MOF" && e.to === "meta:BOF")).toBe(true);
    expect(edges.some((e) => e.from === "google:TOF" && e.to === "meta:MOF")).toBe(true);
  });
});
