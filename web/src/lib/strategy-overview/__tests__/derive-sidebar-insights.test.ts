import { describe, expect, it } from "vitest";

import { deriveSidebarInsights } from "@/lib/strategy-overview/derive-sidebar-insights";

describe("deriveSidebarInsights", () => {
  it("derives voice tone from enrichment vectors", () => {
    const out = deriveSidebarInsights([
      {
        platform: "meta",
        format: "video",
        ai_extracted_angle: "speed · Hook: Fast booking · Body: Same-day slots",
        ai_extracted_voice_tone: { formal: 0.7, emotional: 0.35, confidence: 0.8 },
        raw_payload: { age_audience: { min: 25, max: 44 }, location_audience: [{ name: "Lithuania" }] },
      },
      {
        platform: "meta",
        format: "video",
        ai_extracted_angle: "price · Hook: From 999 · Body: Implant offer",
        ai_extracted_voice_tone: { formal: 0.68, emotional: 0.4, confidence: 0.75 },
        raw_payload: { age_audience: { min: 30, max: 55 } },
      },
      {
        platform: "google",
        format: "image",
        ai_extracted_angle: "speed · Hook: Quick consult · Body: Online booking",
        ai_extracted_voice_tone: { formal: 0.62, emotional: 0.42, confidence: 0.7 },
      },
    ]);

    expect(out.toneOfVoice.primary).not.toBe("Confident & Helpful");
    expect(out.toneOfVoice.primary.toLowerCase()).toContain("professional");
    expect(out.audienceSignals.ageRange).toContain("25");
    expect(out.audienceSignals.interests[0]).toMatch(/speed|price/i);
    expect(out.topAngles[0]?.angle).not.toContain("Hook:");
    expect(out.dominantFormat.percentage).toBeGreaterThan(0);
  });

  it("dedupes audience interests from angle categories not raw hooks", () => {
    const out = deriveSidebarInsights([
      {
        platform: "meta",
        format: "image",
        ai_extracted_angle: "speed · Hook: A · Body: x",
        ai_extracted_voice_tone: { formal: 0.5, emotional: 0.5, confidence: 0.6 },
      },
      {
        platform: "meta",
        format: "image",
        ai_extracted_angle: "speed · Hook: B · Body: y",
        ai_extracted_voice_tone: { formal: 0.5, emotional: 0.5, confidence: 0.6 },
      },
      {
        platform: "meta",
        format: "image",
        ai_extracted_angle: "price · Hook: C · Body: z",
        ai_extracted_voice_tone: { formal: 0.5, emotional: 0.5, confidence: 0.6 },
      },
    ]);

    expect(out.audienceSignals.interests.some((i) => /speed|convenience/i.test(i))).toBe(true);
    expect(out.audienceSignals.interests.some((i) => i.includes("Hook:"))).toBe(false);
  });
});
