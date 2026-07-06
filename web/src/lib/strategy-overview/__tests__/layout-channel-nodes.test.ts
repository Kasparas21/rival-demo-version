import { describe, expect, it } from "vitest";

import { layoutFunnelCellPositions } from "@/lib/strategy-overview/layout-funnel-cells";
import {
  GOAL_NODE_SIZE,
  JOURNEY_GOAL_NODE_ID,
  layoutChannelNodePositions,
  layoutOrganicRail,
  resolveOrganicNodeSize,
} from "@/lib/strategy-overview/layout-channel-nodes";
import type { FunnelCellNodePayload, StrategyChannelSignals } from "@/lib/strategy-overview/payload-types";

function sampleCells(): FunnelCellNodePayload[] {
  return [
    {
      id: "google:TOF",
      platform: "google",
      label: "Google",
      funnelStage: "TOF",
      adCount: 160,
      estSpendEur: 7500,
      estSpendEurLow: 6000,
      estSpendEurHigh: 9000,
      sampleAdIds: [],
      cellConfidence: "high",
      position: { x: 0, y: 0 },
    },
    {
      id: "meta:TOF",
      platform: "meta",
      label: "Meta",
      funnelStage: "TOF",
      adCount: 7,
      estSpendEur: 500,
      estSpendEurLow: 400,
      estSpendEurHigh: 600,
      sampleAdIds: [],
      cellConfidence: "medium",
      position: { x: 0, y: 0 },
    },
    {
      id: "tiktok:TOF",
      platform: "tiktok",
      label: "TikTok",
      funnelStage: "TOF",
      adCount: 90,
      estSpendEur: 3000,
      estSpendEurLow: 2500,
      estSpendEurHigh: 3500,
      sampleAdIds: [],
      cellConfidence: "high",
      position: { x: 0, y: 0 },
    },
    {
      id: "meta:BOF",
      platform: "meta",
      label: "Meta",
      funnelStage: "BOF",
      adCount: 15,
      estSpendEur: 2000,
      estSpendEurLow: 1500,
      estSpendEurHigh: 2500,
      sampleAdIds: [],
      cellConfidence: "high",
      position: { x: 0, y: 0 },
    },
  ];
}

function organicNode(
  platform: StrategyChannelSignals["organicNodes"][number]["platform"],
  paired: string | null,
): StrategyChannelSignals["organicNodes"][number] {
  return {
    id: `organic:${platform}`,
    platform,
    label: platform,
    postCount: 10,
    postsPerWeek: 2,
    avgEngagement: 1000,
    lastPostAt: null,
    topThemes: [],
    pairedPaidPlatform: paired as never,
  };
}

describe("layoutOrganicRail", () => {
  it("does not overlap organic nodes", () => {
    const cells = sampleCells();
    const cellLayout = layoutFunnelCellPositions(cells, 160);
    const { minX, maxX } = (() => {
      let minX = Infinity;
      let maxX = -Infinity;
      for (const box of cellLayout.values()) {
        minX = Math.min(minX, box.x);
        maxX = Math.max(maxX, box.x + box.width);
      }
      return { minX, maxX };
    })();

    const nodes = [
      organicNode("youtube", "google"),
      organicNode("facebook", "meta"),
      organicNode("instagram", "meta"),
      organicNode("tiktok", "tiktok"),
      organicNode("linkedin", "linkedin"),
      organicNode("twitter", null),
    ];

    const available = maxX - minX;
    const nodeSize = resolveOrganicNodeSize(nodes.length, available);

    const rail = layoutOrganicRail(nodes, {
      minX,
      maxX,
      railY: 0,
      cellLayout,
      cells: cells.map((c) => ({ id: c.id, platform: String(c.platform) })),
      nodeSize,
    });

    const boxes = [...rail.values()].sort((a, b) => a.x - b.x);
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i]!.x - (boxes[i - 1]!.x + boxes[i - 1]!.width)).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps unpaired twitter inside the funnel grid span", () => {
    const cells = sampleCells();
    const cellLayout = layoutFunnelCellPositions(cells, 160);
    let minX = Infinity;
    let maxX = -Infinity;
    for (const box of cellLayout.values()) {
      minX = Math.min(minX, box.x);
      maxX = Math.max(maxX, box.x + box.width);
    }

    const nodes = [organicNode("twitter", null)];
    const available = maxX - minX;
    const nodeSize = resolveOrganicNodeSize(nodes.length, available);
    const rail = layoutOrganicRail(nodes, {
      minX,
      maxX,
      railY: 0,
      cellLayout,
      cells: cells.map((c) => ({ id: c.id, platform: String(c.platform) })),
      nodeSize,
    });
    const box = rail.get("organic:twitter");
    expect(box).toBeDefined();
    expect(box!.x).toBeGreaterThanOrEqual(minX - 1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(maxX + 1);
  });
});

describe("layoutChannelNodePositions", () => {
  it("places organic rail above TOF and email below BOF", () => {
    const cells = sampleCells();
    const cellLayout = layoutFunnelCellPositions(cells, 160);
    const tofY = cellLayout.get("google:TOF")!.y;
    const bofBottom =
      cellLayout.get("meta:BOF")!.y + cellLayout.get("meta:BOF")!.height;

    const signals: StrategyChannelSignals = {
      version: 1,
      computedAt: new Date().toISOString(),
      organicNodes: [organicNode("youtube", "google")],
      emailNode: {
        id: "email",
        label: "Email",
        emailCount: 8,
        emailsPerWeek: 1,
        dominantType: "promotional",
        dominantAngle: null,
        offerSharePct: 30,
        lastEmailAt: null,
        espDetected: "Klaviyo",
      },
      channelEdges: [],
    };

    const layout = layoutChannelNodePositions({
      cellLayout,
      cells: cells.map((c) => ({ id: c.id, platform: String(c.platform) })),
      signals,
      emailAnchorCellId: "meta:BOF",
    });

    const organic = layout.get("organic:youtube")!;
    const email = layout.get("email")!;
    expect(organic.y + organic.height).toBeLessThan(tofY);
    expect(email.y).toBeGreaterThan(bofBottom);
  });

  it("places goal node below email when journey goal is provided", () => {
    const cells = sampleCells();
    const cellLayout = layoutFunnelCellPositions(cells, 160);

    const signals: StrategyChannelSignals = {
      version: 1,
      computedAt: new Date().toISOString(),
      organicNodes: [],
      emailNode: {
        id: "email",
        label: "Email",
        emailCount: 3,
        emailsPerWeek: 0.5,
        dominantType: "promotional",
        dominantAngle: null,
        offerSharePct: 20,
        lastEmailAt: null,
        espDetected: null,
      },
      channelEdges: [],
    };

    const layout = layoutChannelNodePositions({
      cellLayout,
      cells: cells.map((c) => ({ id: c.id, platform: String(c.platform) })),
      signals,
      emailAnchorCellId: "meta:BOF",
      journeyGoal: {
        version: 1,
        computedAt: new Date().toISOString(),
        kind: "purchase",
        label: "Purchase on site",
        subtitle: "",
        catalogBreadth: "single",
        catalogLabel: "Single hero product",
        topDestinations: [],
        goalEdges: [
          {
            from: "meta:BOF",
            to: "goal",
            kind: "bof_to_goal",
            pathIntent: "direct_sale",
            pathIntentLabel: "Direct sale",
            alignment: "direct",
            confidence: 0.8,
            reasoning: "",
            style: "solid",
          },
        ],
        pathIntentBreakdown: [{ intent: "direct_sale", label: "Direct sale", pathCount: 1, sharePct: 100 }],
        evidence: {
          narrative: "Test narrative",
          deals: [],
          categories: [],
          topCreatives: [],
          landingPreviews: [],
          angleHighlights: [],
          emailOfferSummary: null,
        },
        journeySummary: "Direct sale → Purchase on site",
        macroFraming: "One conversion path rolls up to purchase on site.",
        signals: [],
        confidence: 0.8,
      },
    });

    const email = layout.get("email")!;
    const goal = layout.get(JOURNEY_GOAL_NODE_ID)!;
    expect(goal).toBeDefined();
    expect(goal.y).toBeGreaterThan(email.y + email.height);
    expect(goal.width).toBe(GOAL_NODE_SIZE.width);
  });
});
