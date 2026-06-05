import { describe, expect, it } from "vitest";

import { applyLandingHeroHeadlineExperiment } from "@/lib/analytics/landing-hero-experiment";

const controlHeadline = {
  line1Prefix: "see ",
  highlight: "every ad",
  line2: "your competitors run.",
  subline: "across all 6 platforms, in one dashboard",
};

describe("applyLandingHeroHeadlineExperiment", () => {
  it("returns control copy for control variant", () => {
    expect(
      applyLandingHeroHeadlineExperiment(controlHeadline, "control", "en"),
    ).toEqual(controlHeadline);
  });

  it("returns variant copy only for test on English", () => {
    const variant = applyLandingHeroHeadlineExperiment(controlHeadline, "test", "en");
    expect(variant).not.toEqual(controlHeadline);
    expect(variant.highlight).toBe("what rivals");
  });

  it("shows test copy on non-English locales until translated", () => {
    const variant = applyLandingHeroHeadlineExperiment(controlHeadline, "test", "de");
    expect(variant).not.toEqual(controlHeadline);
    expect(variant.highlight).toBe("what rivals");
  });
});
