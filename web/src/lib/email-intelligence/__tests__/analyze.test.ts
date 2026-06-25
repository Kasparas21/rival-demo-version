import { describe, expect, it } from "vitest";

import {
  parseEmailIntelligenceAnalysisFromLlmText,
  stripHtmlToPlainText,
  stripJsonFences,
} from "../analyze";

describe("stripHtmlToPlainText", () => {
  it("strips tags and collapses whitespace", () => {
    expect(stripHtmlToPlainText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });
});

describe("parseEmailIntelligenceAnalysisFromLlmText", () => {
  const validPayload = {
    email_type: "promotional",
    ai_summary: "Flash sale on bestsellers.",
    ai_offers: [{ type: "discount", value: "20% off", code: "SAVE20" }],
    ai_cta: "Shop now",
    ai_angle: "urgency",
    esp_detected: "Klaviyo",
  };

  it("parses raw JSON", () => {
    const parsed = parseEmailIntelligenceAnalysisFromLlmText(JSON.stringify(validPayload));
    expect(parsed.email_type).toBe("promotional");
    expect(parsed.ai_offers).toHaveLength(1);
  });

  it("parses fenced JSON from LLM output", () => {
    const fenced = "```json\n" + JSON.stringify(validPayload) + "\n```";
    expect(stripJsonFences(fenced)).toBe(JSON.stringify(validPayload));
    const parsed = parseEmailIntelligenceAnalysisFromLlmText(fenced);
    expect(parsed.esp_detected).toBe("Klaviyo");
  });

  it("rejects invalid shapes", () => {
    expect(() =>
      parseEmailIntelligenceAnalysisFromLlmText(JSON.stringify({ email_type: "not-a-type" })),
    ).toThrow();
  });
});
