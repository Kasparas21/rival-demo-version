import { describe, expect, it } from "vitest";

import {
  summarizeChannelSignalsForMcp,
  summarizeJourneyGoalForMcp,
} from "@/lib/mcp/summarize-journey-goal-for-mcp";
import type { StrategyChannelSignals, StrategyJourneyGoal } from "@/lib/strategy-overview/payload-types";

const minimalGoal: StrategyJourneyGoal = {
  version: 1,
  computedAt: "2026-07-05T12:00:00.000Z",
  kind: "purchase",
  label: "Purchase on site",
  subtitle: "BOF conversion",
  catalogBreadth: "catalog",
  catalogLabel: "10+ landing pages",
  topDestinations: [{ url: "https://shop.example.com", displayUrl: "shop.example.com", adCount: 5, sharePct: 40 }],
  goalEdges: [
    {
      from: "meta:BOF",
      to: "goal",
      kind: "bof_to_goal",
      pathIntent: "discount_sale",
      pathIntentLabel: "Discount sale",
      alignment: "direct",
      confidence: 0.8,
      reasoning: "BOF ads push promos",
      style: "solid",
    },
  ],
  pathIntentBreakdown: [{ intent: "discount_sale", label: "Discount sale", pathCount: 3, sharePct: 60 }],
  evidence: {
    narrative: "Discount-led funnel.",
    deals: [{ label: "30% off", source: "email", code: null, channel: "email" }],
    categories: [{ label: "Shoes", url: null, adCount: 2, sharePct: 25 }],
    topCreatives: [],
    landingPreviews: [],
    angleHighlights: ["urgency"],
    emailOfferSummary: "2 of 8 emails contain offers",
  },
  journeySummary: "Organic → Paid → Email → Purchase",
  macroFraming: "Catalog purchase funnel",
  signals: ["discount"],
  confidence: 0.85,
};

describe("summarizeJourneyGoalForMcp", () => {
  it("includes evidence and path breakdown", () => {
    const out = summarizeJourneyGoalForMcp(minimalGoal);
    expect(out.label).toBe("Purchase on site");
    expect(out.evidence.deals).toHaveLength(1);
    expect(out.goal_edges[0]?.path_intent).toBe("discount_sale");
    expect(out.path_intent_breakdown[0]?.pathCount).toBe(3);
  });
});

describe("summarizeChannelSignalsForMcp", () => {
  it("returns null for missing signals", () => {
    expect(summarizeChannelSignalsForMcp(null)).toBeNull();
  });

  it("maps organic and email nodes", () => {
    const signals: StrategyChannelSignals = {
      version: 1,
      computedAt: "2026-07-05T12:00:00.000Z",
      organicNodes: [
        {
          id: "organic:instagram",
          platform: "instagram",
          label: "Instagram",
          postCount: 12,
          postsPerWeek: 2,
          avgEngagement: 150,
          lastPostAt: "2026-07-01T00:00:00.000Z",
          topThemes: ["product", "lifestyle"],
          pairedPaidPlatform: "meta",
        },
      ],
      emailNode: {
        id: "email",
        label: "Email",
        emailCount: 8,
        emailsPerWeek: 1.5,
        dominantType: "promotional",
        dominantAngle: "urgency",
        offerSharePct: 25,
        lastEmailAt: "2026-06-28T00:00:00.000Z",
        espDetected: "Klaviyo",
      },
      channelEdges: [],
    };
    const out = summarizeChannelSignalsForMcp(signals);
    expect(out?.organic_nodes).toHaveLength(1);
    expect(out?.email_node?.esp_detected).toBe("Klaviyo");
  });
});
