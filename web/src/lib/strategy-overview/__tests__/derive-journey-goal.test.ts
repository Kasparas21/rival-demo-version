import { describe, expect, it } from "vitest";

import { buildJourneyGoal, hasJourneyGoal } from "@/lib/strategy-overview/derive-journey-goal";
import type { JourneyGoalInputs } from "@/lib/strategy-overview/derive-journey-goal";
import type { StrategyChannelSignals, StrategyMapPayload } from "@/lib/strategy-overview/payload-types";

function baseMap(overrides: Partial<StrategyMapPayload> = {}): StrategyMapPayload {
  return {
    title: "Test",
    competitor: { name: "Acme", domain: "acme.com", logoUrl: null },
    totalAdSpend: {
      value: 1000,
      low: 500,
      high: 1500,
      currency: "EUR",
      unit: "month",
      confidence: "medium",
    },
    spendVsSimilar: "Medium",
    spendTrendline: [],
    audienceSignals: { interests: [], ageRange: "18-65", geo: "US", targetingType: [] },
    dominantFormat: { format: "Video", percentage: 60 },
    toneOfVoice: { primary: "Bold", attributes: [] },
    topAngles: [],
    platformNodes: [],
    funnelCells: [
      {
        id: "meta:BOF",
        platform: "meta",
        label: "Meta",
        funnelStage: "BOF",
        adCount: 20,
        estSpendEur: 2000,
        estSpendEurLow: 1500,
        estSpendEurHigh: 2500,
        sampleAdIds: [],
        cellConfidence: "high",
        position: { x: 0, y: 0 },
      },
      {
        id: "google:BOF",
        platform: "google",
        label: "Google",
        funnelStage: "BOF",
        adCount: 8,
        estSpendEur: 800,
        estSpendEurLow: 600,
        estSpendEurHigh: 1000,
        sampleAdIds: [],
        cellConfidence: "high",
        position: { x: 0, y: 0 },
      },
    ],
    funnelEdges: [],
    activeAdCount: 28,
    platformCount: 2,
    ...overrides,
  };
}

function shopAd(id: string, url: string) {
  return {
    id,
    platform: "meta",
    ad_text: "Shop now — 20% off your order today",
    ai_extracted_angle: "discount offer",
    funnel_stage: "BOF",
    ad_creative_url: null,
    raw_payload: { destinationUrl: url, cta_text: "Shop now" },
  };
}

describe("buildJourneyGoal", () => {
  it("infers purchase goal from shop landing pages", () => {
    const inputs: JourneyGoalInputs = {
      bofAds: [
        shopAd("1", "https://store.example.com/products/sneakers"),
        shopAd("2", "https://store.example.com/products/sneakers"),
        shopAd("3", "https://store.example.com/collections/sale"),
      ],
      allActiveAds: [],
      emails: [{ email_type: "promotional", subject: null, ai_angle: "Sale", ai_cta: "Shop", ai_summary: null, ai_offers: null }],
      brandDomain: "store.example.com",
    };

    const goal = buildJourneyGoal(baseMap(), inputs);
    expect(goal).not.toBeNull();
    expect(goal!.kind).toBe("purchase");
    expect(goal!.label).toBe("Purchase on site");
    expect(hasJourneyGoal(goal)).toBe(true);
  });

  it("marks catalog breadth when many distinct landing URLs", () => {
    const inputs: JourneyGoalInputs = {
      bofAds: [
        shopAd("1", "https://shop.example.com/p/1"),
        shopAd("2", "https://shop.example.com/p/2"),
        shopAd("3", "https://shop.example.com/p/3"),
        shopAd("4", "https://shop.example.com/p/4"),
        shopAd("5", "https://shop.example.com/p/5"),
        shopAd("6", "https://shop.example.com/p/6"),
      ],
      allActiveAds: [],
      emails: [],
      brandDomain: "shop.example.com",
    };

    const goal = buildJourneyGoal(baseMap(), inputs);
    expect(goal!.catalogBreadth).toBe("catalog");
    expect(goal!.topDestinations.length).toBeGreaterThan(0);
  });

  it("marks single-product breadth when one URL dominates", () => {
    const inputs: JourneyGoalInputs = {
      bofAds: [
        shopAd("1", "https://solo.example.com/product/widget"),
        shopAd("2", "https://solo.example.com/product/widget"),
        shopAd("3", "https://solo.example.com/product/widget"),
      ],
      allActiveAds: [],
      emails: [],
      brandDomain: "solo.example.com",
    };

    const goal = buildJourneyGoal(baseMap(), inputs);
    expect(goal!.catalogBreadth).toBe("single");
  });

  it("creates bof_to_goal edges for each BOF cell and email_to_goal when email exists", () => {
    const channelSignals: StrategyChannelSignals = {
      version: 1,
      computedAt: new Date().toISOString(),
      organicNodes: [],
      emailNode: {
        id: "email",
        label: "Email",
        emailCount: 5,
        emailsPerWeek: 1,
        dominantType: "promotional",
        dominantAngle: null,
        offerSharePct: 40,
        lastEmailAt: null,
        espDetected: null,
      },
      channelEdges: [],
    };

    const inputs: JourneyGoalInputs = {
      bofAds: [shopAd("1", "https://store.example.com/shop")],
      allActiveAds: [],
      emails: [],
      brandDomain: "store.example.com",
    };

    const goal = buildJourneyGoal(baseMap(), inputs, channelSignals);
    const bofEdges = goal!.goalEdges.filter((e) => e.kind === "bof_to_goal");
    const emailEdge = goal!.goalEdges.find((e) => e.kind === "email_to_goal");
    expect(bofEdges).toHaveLength(2);
    expect(bofEdges[0]?.pathIntent).toBeTruthy();
    expect(emailEdge?.from).toBe("email");
    expect(emailEdge?.pathIntent).toBe("discount_sale");
    expect(goal!.pathIntentBreakdown.length).toBeGreaterThan(0);
    expect(goal!.macroFraming).toContain("outcome");
  });

  it("returns null when no BOF cells or ads", () => {
    const inputs: JourneyGoalInputs = {
      bofAds: [],
      allActiveAds: [],
      emails: [],
      brandDomain: null,
    };
    const goal = buildJourneyGoal(baseMap({ funnelCells: [] }), inputs);
    expect(goal).toBeNull();
    expect(hasJourneyGoal(goal)).toBe(false);
  });
});
