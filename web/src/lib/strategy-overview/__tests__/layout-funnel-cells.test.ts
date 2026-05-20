import type { FunnelCellNodePayload } from "@/lib/strategy-overview/payload-types";
import { layoutFunnelCellPositions } from "@/lib/strategy-overview/layout-funnel-cells";
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

function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

describe("layoutFunnelCellPositions", () => {
  it("keeps platform columns and stage rows without overlap (Google 94 TOF + Meta 2 TOF)", () => {
    const cells = [
      cell({ id: "google:TOF", platform: "google", funnelStage: "TOF", adCount: 94 }),
      cell({ id: "meta:TOF", platform: "meta", funnelStage: "TOF", adCount: 2 }),
      cell({ id: "google:MOF", platform: "google", funnelStage: "MOF", adCount: 1 }),
      cell({ id: "meta:MOF", platform: "meta", funnelStage: "MOF", adCount: 18 }),
      cell({ id: "google:BOF", platform: "google", funnelStage: "BOF", adCount: 17 }),
      cell({ id: "meta:BOF", platform: "meta", funnelStage: "BOF", adCount: 40 }),
    ];
    const layout = layoutFunnelCellPositions(cells, 94);
    const boxes = cells.map((c) => layout.get(c.id)!);

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(overlaps(boxes[i]!, boxes[j]!)).toBe(false);
      }
    }

    expect(layout.get("google:TOF")!.x).toBeLessThan(layout.get("meta:TOF")!.x);
    expect(layout.get("google:TOF")!.y).toBe(layout.get("meta:TOF")!.y);
    expect(layout.get("google:MOF")!.y).toBeGreaterThan(layout.get("google:TOF")!.y + layout.get("google:TOF")!.height);
  });
});
