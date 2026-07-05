import { describe, expect, it } from "vitest";

import {
  parseEmailDeepAnalysisFromLlmText,
  parseEmailIntelligenceAnalysisFromLlmText,
  stripHtmlToPlainText,
  stripJsonFences,
} from "../analyze";

const validDeepPayload = {
  email_type: "promotional",
  ai_angle: "urgency",
  executive_summary:
    "This flash sale email pushes limited-time discounts on bestsellers. It combines scarcity with a clear shop-now CTA. Strong competitive positioning around seasonal urgency.",
  funnel_stage: "conversion",
  confidence: "high",
  subject_line: {
    hook: "Time-bound discount in subject",
    tactics: ["emoji", "deadline", "percent off"],
  },
  preheader_role: "Reinforces the deadline",
  audience_signals: ["bargain hunters", "existing customers"],
  persona_hint: "Deal-driven repeat buyer",
  persuasion_triggers: ["scarcity", "social proof"],
  emotional_drivers: ["fear of missing out", "excitement"],
  urgency_tactics: ["countdown", "limited stock"],
  copy_structure: {
    hook: "Opens with the biggest discount",
    body_framework: ["hero offer", "product grid", "urgency reminder"],
    cta_pattern: "Shop now",
    secondary_ctas: ["View sale"],
  },
  ai_offers: [{ type: "discount", value: "20% off", code: "SAVE20" }],
  positioning: "Premium brand running a rare deep discount",
  what_works: ["Clear offer hierarchy", "Strong urgency"],
  weaknesses: ["Heavy image load"],
  adaptation_playbook: [
    "Test a deadline in the subject line",
    "Lead with the top offer above the fold",
    "Add social proof near the CTA",
  ],
  esp_detected: "Klaviyo",
};

describe("stripHtmlToPlainText", () => {
  it("strips tags and collapses whitespace", () => {
    expect(stripHtmlToPlainText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });
});

describe("parseEmailDeepAnalysisFromLlmText", () => {
  it("parses raw JSON", () => {
    const parsed = parseEmailDeepAnalysisFromLlmText(JSON.stringify(validDeepPayload));
    expect(parsed.email_type).toBe("promotional");
    expect(parsed.ai_offers).toHaveLength(1);
    expect(parsed.adaptation_playbook.length).toBeGreaterThanOrEqual(3);
  });

  it("parses fenced JSON from LLM output", () => {
    const fenced = "```json\n" + JSON.stringify(validDeepPayload) + "\n```";
    expect(stripJsonFences(fenced)).toBe(JSON.stringify(validDeepPayload));
    const parsed = parseEmailDeepAnalysisFromLlmText(fenced);
    expect(parsed.esp_detected).toBe("Klaviyo");
  });

  it("rejects invalid shapes", () => {
    expect(() =>
      parseEmailDeepAnalysisFromLlmText(JSON.stringify({ email_type: "not-a-type" })),
    ).toThrow();
  });
});

describe("parseEmailIntelligenceAnalysisFromLlmText", () => {
  it("maps deep payload to legacy list-view fields", () => {
    const parsed = parseEmailIntelligenceAnalysisFromLlmText(JSON.stringify(validDeepPayload));
    expect(parsed.email_type).toBe("promotional");
    expect(parsed.ai_cta).toBe("Shop now");
    expect(parsed.ai_summary).toContain("flash sale");
  });
});
