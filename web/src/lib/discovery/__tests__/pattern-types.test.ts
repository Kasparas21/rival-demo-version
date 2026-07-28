import { describe, expect, it } from "vitest";

import { stripJsonFences } from "@/lib/email-intelligence/analyze";
import {
  discoveryPatternInsightsSchema,
  normalizeDiscoveryPatternInsights,
} from "@/lib/discovery/pattern-types";

const validPayload = {
  headline: "Competitors are testing more video hooks this week.",
  market_temperature: "heating_up",
  temperature_reason: "Launches up 40% week over week.",
  patterns: [
    {
      title: "Free consult hooks rising",
      category: "hook",
      description: "Three competitors launched consult-led creatives.",
      confidence: "high",
      evidence_ad_ids: ["ad-1", "ad-2"],
      trend_direction: "rising",
    },
  ],
  winners_playbook: ["Lead with outcome-first headlines"],
  graveyard_lessons: ["Price-only hooks died fast"],
  recommended_tests: [
    {
      idea: "Test a financing-led video hook",
      rationale: "Two winners used installment framing.",
      inspired_by_ad_ids: ["ad-9"],
    },
  ],
  competitor_spotlight: {
    name: "Alpha Dental",
    observation: "Launched 4 new creatives.",
  },
};

describe("discoveryPatternInsightsSchema", () => {
  it("accepts a valid LLM payload", () => {
    const parsed = discoveryPatternInsightsSchema.parse(validPayload);
    expect(parsed.headline).toBe(validPayload.headline);
    expect(parsed.patterns).toHaveLength(1);
  });

  it("normalizes missing arrays to defaults", () => {
    const normalized = normalizeDiscoveryPatternInsights({
      headline: "Steady week",
      market_temperature: "steady",
      temperature_reason: "Launch volume flat",
    });
    expect(normalized.patterns).toEqual([]);
    expect(normalized.winners_playbook).toEqual([]);
    expect(normalized.graveyard_lessons).toEqual([]);
    expect(normalized.recommended_tests).toEqual([]);
    expect(normalized.competitor_spotlight).toBeNull();
  });

  it("parses fenced JSON via stripJsonFences", () => {
    const fenced = `\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\``;
    const parsed = JSON.parse(stripJsonFences(fenced));
    const normalized = normalizeDiscoveryPatternInsights(parsed);
    expect(normalized.patterns[0]?.evidence_ad_ids).toEqual(["ad-1", "ad-2"]);
  });
});
