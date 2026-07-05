import { describe, expect, it } from "vitest";

import { computeJourneyGoalAnalytics, parseJourneySteps } from "@/lib/strategy-overview/journey-goal-analytics";
import type { StrategyJourneyGoal } from "@/lib/strategy-overview/payload-types";

const baseGoal: StrategyJourneyGoal = {
  version: 1,
  computedAt: "2026-07-05T12:00:00.000Z",
  kind: "purchase",
  label: "Purchase on site",
  subtitle: "BOF",
  catalogBreadth: "catalog",
  catalogLabel: "10+ pages",
  topDestinations: [{ url: "https://shop.example.com/sale", displayUrl: "shop.example.com/sale", adCount: 8, sharePct: 42 }],
  goalEdges: [
    {
      from: "meta:BOF",
      to: "goal",
      kind: "bof_to_goal",
      pathIntent: "discount_sale",
      pathIntentLabel: "Discount sale",
      alignment: "direct",
      confidence: 0.82,
      reasoning: "Promo-heavy BOF",
      style: "solid",
    },
    {
      from: "organic:instagram",
      to: "goal",
      kind: "bof_to_goal",
      pathIntent: "awareness",
      pathIntentLabel: "Awareness",
      alignment: "supporting",
      confidence: 0.55,
      reasoning: "Feeds retargeting",
      style: "dashed",
    },
  ],
  pathIntentBreakdown: [
    { intent: "discount_sale", label: "Discount sale", pathCount: 3, sharePct: 60 },
    { intent: "direct_sale", label: "Direct sale", pathCount: 1, sharePct: 40 },
  ],
  evidence: {
    narrative: "Discount-led catalog funnel.",
    deals: [
      { label: "30% off", source: "email", code: null, channel: "email" },
      { label: "Free shipping", source: "ad", code: null, channel: "meta" },
    ],
    categories: [{ label: "Shoes", url: null, adCount: 3, sharePct: 35 }],
    topCreatives: [{ adId: "1", platform: "meta", imageUrl: null, headline: "Sale", angle: "urgency", landingUrl: null }],
    landingPreviews: [],
    angleHighlights: ["URGENCY", "BRAND"],
    emailOfferSummary: "2 of 8 emails contain offers",
  },
  journeySummary: "Organic → Discount sale + Direct sale → Email → Purchase on site",
  macroFraming: "Catalog purchase funnel",
  signals: ["discount"],
  confidence: 0.89,
};

describe("parseJourneySteps", () => {
  it("splits arrow-separated summary", () => {
    expect(parseJourneySteps("Organic → Email → Purchase on site")).toEqual([
      "Organic",
      "Email",
      "Purchase on site",
    ]);
  });
});

describe("computeJourneyGoalAnalytics", () => {
  it("builds path mix and ICP insights", () => {
    const a = computeJourneyGoalAnalytics(baseGoal, {
      version: 1,
      computedAt: "2026-07-05T12:00:00.000Z",
      organicNodes: [
        {
          id: "organic:instagram",
          platform: "instagram",
          label: "Instagram",
          postCount: 20,
          postsPerWeek: 2.5,
          avgEngagement: 100,
          lastPostAt: null,
          topThemes: [],
          pairedPaidPlatform: "meta",
        },
      ],
      emailNode: {
        id: "email",
        label: "Email",
        emailCount: 8,
        emailsPerWeek: 1.2,
        dominantType: "promotional",
        dominantAngle: "urgency",
        offerSharePct: 25,
        lastEmailAt: null,
        espDetected: "Klaviyo",
      },
      channelEdges: [],
    });

    expect(a.pathMix).toHaveLength(2);
    expect(a.insights.length).toBeGreaterThan(0);
    expect(a.alignment.direct).toBe(1);
    expect(a.dealSources).toHaveLength(2);
    expect(a.concentrationPct).toBe(42);
  });
});
