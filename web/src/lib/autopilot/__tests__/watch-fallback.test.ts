import { describe, expect, it } from "vitest";

import { ALL_ALERT_TYPES } from "@/lib/alerts/alert-types";
import { watchFallbackRecommendation } from "@/lib/autopilot/watch-fallback-templates";

describe("watchFallbackRecommendation", () => {
  it("returns action-oriented copy for every alert type", () => {
    for (const type of ALL_ALERT_TYPES) {
      const rec = watchFallbackRecommendation(type, "Acme");
      expect(rec.headline.length).toBeGreaterThan(0);
      expect(rec.headline.length).toBeLessThanOrEqual(100);
      expect(rec.context.length).toBeGreaterThan(30);
      expect(rec.context.length).toBeLessThanOrEqual(450);
      expect(rec.recommendation.length).toBeGreaterThan(10);
      expect(rec.recommendation.length).toBeLessThanOrEqual(550);
      expect(["high", "medium", "low"]).toContain(rec.confidence);
    }
  });

  it("never contains em or en dashes in any field", () => {
    for (const type of ALL_ALERT_TYPES) {
      const rec = watchFallbackRecommendation(type, "Acme", {
        brandName: "Nike",
        brandContext: null,
        brandDomain: "nike.com",
      });
      expect(rec.headline).not.toMatch(/[—–]/);
      expect(rec.context).not.toMatch(/[—–]/);
      expect(rec.recommendation).not.toMatch(/[—–]/);
    }
  });

  it("personalizes copy with the client brand name when provided", () => {
    const rec = watchFallbackRecommendation("activity_spike", "Acme", {
      brandName: "Nike",
      brandContext: null,
      brandDomain: "nike.com",
    });
    expect(rec.recommendation).toContain("Nike");
  });
});
