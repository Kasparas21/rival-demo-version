import { describe, expect, it } from "vitest";

import {
  emailDeepAnalysisSchema,
  EMAIL_AI_ANALYSIS_VERSION,
  emailNeedsDeepAnalysis,
  legacySummaryFromDeep,
} from "../email-deep-analysis-types";

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
} as const;

describe("emailDeepAnalysisSchema", () => {
  it("parses a valid v2 payload", () => {
    const parsed = emailDeepAnalysisSchema.parse(validDeepPayload);
    expect(parsed.email_type).toBe("promotional");
    expect(parsed.adaptation_playbook).toHaveLength(3);
  });

  it("rejects incomplete payloads", () => {
    expect(() => emailDeepAnalysisSchema.parse({ email_type: "promotional" })).toThrow();
  });
});

describe("emailNeedsDeepAnalysis", () => {
  it("returns true when deep analysis is missing", () => {
    expect(emailNeedsDeepAnalysis({ ai_deep_analysis: null, ai_analysis_version: null })).toBe(true);
  });

  it("returns true when version is stale", () => {
    expect(
      emailNeedsDeepAnalysis({
        ai_deep_analysis: validDeepPayload,
        ai_analysis_version: "v1",
      }),
    ).toBe(true);
  });

  it("returns false when v2 is present", () => {
    expect(
      emailNeedsDeepAnalysis({
        ai_deep_analysis: validDeepPayload,
        ai_analysis_version: EMAIL_AI_ANALYSIS_VERSION,
      }),
    ).toBe(false);
  });
});

describe("legacySummaryFromDeep", () => {
  it("returns executive summary when short enough", () => {
    expect(legacySummaryFromDeep(validDeepPayload)).toBe(validDeepPayload.executive_summary);
  });
});
