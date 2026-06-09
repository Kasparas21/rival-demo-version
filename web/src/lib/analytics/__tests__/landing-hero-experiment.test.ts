import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyLandingHeroHeadlineExperiment,
  isLandingHeroTestVariant,
  parseDevHeroVariantPreview,
} from "@/lib/analytics/landing-hero-experiment";

const controlHeadline = {
  line1Prefix: "see ",
  highlight: "every ad",
  line2: "your competitors run.",
  subline: "across all 6 platforms, in one dashboard",
};

describe("parseDevHeroVariantPreview", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps dev query params to variants in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(parseDevHeroVariantPreview("control")).toBe("control");
    expect(parseDevHeroVariantPreview("example-variant")).toBe("test");
    expect(parseDevHeroVariantPreview("variant")).toBe("test");
    expect(parseDevHeroVariantPreview(null)).toBeNull();
  });

  it("ignores preview params outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(parseDevHeroVariantPreview("control")).toBeNull();
  });
});

describe("isLandingHeroTestVariant", () => {
  it("treats PostHog example-variant as the test arm", () => {
    expect(isLandingHeroTestVariant("example-variant")).toBe(true);
    expect(isLandingHeroTestVariant("control")).toBe(false);
  });
});

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
