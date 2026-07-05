import { describe, expect, it } from "vitest";

import {
  buildJourneyGoalEvidence,
  categoryLabelFromUrl,
} from "@/lib/strategy-overview/build-journey-goal-evidence";

describe("categoryLabelFromUrl", () => {
  it("extracts collection slug", () => {
    expect(categoryLabelFromUrl("https://shop.example.com/collections/running-shoes")).toBe(
      "Running Shoes",
    );
  });

  it("extracts product slug", () => {
    expect(categoryLabelFromUrl("https://shop.example.com/products/ultra-boost")).toBe("Ultra Boost");
  });
});

describe("buildJourneyGoalEvidence", () => {
  it("builds narrative with categories, deals, and creatives", () => {
    const evidence = buildJourneyGoalEvidence({
      goalKind: "purchase",
      bofAds: [
        {
          id: "1",
          platform: "meta",
          ad_text: "Get 20% off running shoes today — shop now",
          ai_extracted_angle: "discount offer",
          funnel_stage: "BOF",
          ad_creative_url: "https://cdn.example.com/ad1.jpg",
          raw_payload: {
            destinationUrl: "https://adidas.com/collections/running",
            headline: "20% Off Running",
          },
        },
        {
          id: "2",
          platform: "meta",
          ad_text: "Free shipping on orders over $50",
          ai_extracted_angle: null,
          funnel_stage: "BOF",
          ad_creative_url: "https://cdn.example.com/ad2.jpg",
          raw_payload: { destinationUrl: "https://adidas.com/collections/running" },
        },
      ],
      emails: [
        {
          email_type: "promotional",
          subject: "Sale",
          ai_angle: "value",
          ai_cta: "Shop",
          ai_summary: null,
          ai_offers: [{ type: "discount", value: "30% off", code: "RUN30" }],
        },
      ],
      topDestinations: [
        {
          url: "https://adidas.com/collections/running",
          displayUrl: "adidas.com/collections/running",
          adCount: 2,
          sharePct: 100,
        },
      ],
      pathIntentBreakdown: [
        { intent: "discount_sale", label: "Discount sale", pathCount: 2, sharePct: 100 },
      ],
      angleCategories: [{ label: "Price & discount", count: 5, sharePct: 40 }],
      topAngles: [{ angle: "Limited time offer", rank: 1 }],
      brandDomain: "adidas.com",
    });

    expect(evidence.narrative).toContain("adidas.com");
    expect(evidence.narrative).toContain("purchase on site");
    expect(evidence.categories.length).toBeGreaterThan(0);
    expect(evidence.categories[0]?.label).toBe("Running");
    expect(evidence.deals.length).toBeGreaterThan(0);
    expect(evidence.topCreatives).toHaveLength(2);
    expect(evidence.landingPreviews[0]?.previewImageUrl).toBeTruthy();
    expect(evidence.emailOfferSummary).toContain("1 of 1");
  });
});
