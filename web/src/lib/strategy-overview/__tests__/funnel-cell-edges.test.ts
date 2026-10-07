import type { FunnelCellNodePayload } from "@/lib/strategy-overview/payload-types";
import {
  deriveFunnelCellEdges,
  isSpecificLandingPage,
  sharedLandingPageEvidence,
} from "@/lib/strategy-overview/funnel-cell-edges";
import { resolveStrategyMapEdges } from "@/lib/strategy-overview/resolve-map-edges";
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

const pages = (entries: [string, number][]) => new Map(entries);

const grid = [
  cell({ id: "google:TOF", platform: "google", funnelStage: "TOF", adCount: 94 }),
  cell({ id: "meta:TOF", platform: "meta", funnelStage: "TOF", adCount: 12 }),
  cell({ id: "meta:MOF", platform: "meta", funnelStage: "MOF", adCount: 18 }),
  cell({ id: "meta:BOF", platform: "meta", funnelStage: "BOF", adCount: 40 }),
];

describe("deriveFunnelCellEdges", () => {
  it("draws no arrows from stage order and volume alone", () => {
    const { edges, detected } = deriveFunnelCellEdges({ cells: grid, landingPagesByCell: new Map() });
    expect(edges).toEqual([]);
    expect(detected).toBe(0);
  });

  it("connects stages that send people to the same specific page, with hedged wording", () => {
    const { edges } = deriveFunnelCellEdges({
      cells: grid,
      landingPagesByCell: new Map([
        ["meta:TOF", pages([["https://rothys.com/collections/cruiser", 4], ["https://rothys.com/", 8]])],
        ["meta:MOF", pages([["https://rothys.com/collections/cruiser", 2], ["https://rothys.com/", 9]])],
        ["meta:BOF", pages([["https://rothys.com/", 20]])],
      ]),
    });
    expect(edges).toHaveLength(1);
    const [edge] = edges;
    expect(edge).toMatchObject({
      from: "meta:TOF",
      to: "meta:MOF",
      style: "dashed",
      evidence: { sharedLandingPages: ["rothys.com/collections/cruiser"], fromAds: 4, toAds: 2 },
    });
    expect(edge!.reasoning).toBe(
      "4 Meta TOF ads and 2 Meta MOF ads send people to rothys.com/collections/cruiser. Possibly one campaign moving people from awareness to consideration; ad libraries don't show who saw which ad.",
    );
  });

  it("keeps cross-platform arrows out when the sample is too small", () => {
    const landingPagesByCell = new Map([
      ["google:TOF", pages([["https://x.com/offer", 3]])],
      ["meta:BOF", pages([["https://x.com/offer", 5]])],
    ]);
    const allowed = deriveFunnelCellEdges({ cells: grid, landingPagesByCell });
    expect(allowed.edges.map((e) => `${e.from}->${e.to}`)).toEqual(["google:TOF->meta:BOF"]);
    expect(allowed.edges[0]!.style).toBe("solid");

    const blocked = deriveFunnelCellEdges({ cells: grid, landingPagesByCell, allowCrossPlatform: false });
    expect(blocked.edges).toEqual([]);
    expect(blocked.suppressed).toBe(1);
  });
});

describe("landing page evidence", () => {
  it("ignores homepages", () => {
    expect(isSpecificLandingPage("https://rothys.com/")).toBe(false);
    expect(isSpecificLandingPage("https://rothys.com")).toBe(false);
    expect(isSpecificLandingPage("https://rothys.com/sale")).toBe(true);
    expect(sharedLandingPageEvidence(pages([["https://a.com/", 3]]), pages([["https://a.com/", 3]]))).toBeNull();
  });
});

describe("resolveStrategyMapEdges", () => {
  it("draws only stored arrows that carry evidence", () => {
    const withEvidence = {
      from: "meta:TOF",
      to: "meta:MOF",
      confidence: 0.6,
      reasoning: "x",
      style: "dashed" as const,
      evidence: { sharedLandingPages: ["a.com/x"], fromAds: 2, toAds: 2 },
    };
    const legacy = { from: "google:TOF", to: "meta:MOF", confidence: 0.82, reasoning: "feeds", style: "solid" as const };
    const map = { funnelCells: grid, funnelEdges: [withEvidence, legacy] } as never;
    expect(resolveStrategyMapEdges(map)).toEqual([withEvidence]);
  });
});
