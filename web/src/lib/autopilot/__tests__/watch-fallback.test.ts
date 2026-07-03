import { describe, expect, it } from "vitest";

import { ALL_ALERT_TYPES } from "@/lib/alerts/alert-types";
import { watchFallbackRecommendation } from "@/lib/autopilot/watch-fallback-templates";

describe("watchFallbackRecommendation", () => {
  it("returns action-oriented copy for every alert type", () => {
    for (const type of ALL_ALERT_TYPES) {
      const rec = watchFallbackRecommendation(type, "Acme");
      expect(rec.headline.length).toBeGreaterThan(0);
      expect(rec.headline.length).toBeLessThanOrEqual(90);
      expect(rec.recommendation.length).toBeGreaterThan(10);
      expect(rec.recommendation.length).toBeLessThanOrEqual(220);
      expect(["high", "medium", "low"]).toContain(rec.confidence);
    }
  });
});
