import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyLandingHeroHeadlineExperiment,
  isLandingHeroTestVariant,
  parseDevHeroVariantPreview,
} from "@/lib/analytics/landing-hero-experiment";
import { landingCopyDe } from "@/lib/i18n/landing/de";
import { landingCopyEn } from "@/lib/i18n/landing/en";
import { landingCopyNl } from "@/lib/i18n/landing/nl";

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
      applyLandingHeroHeadlineExperiment(landingCopyEn.hero, "control"),
    ).toEqual(landingCopyEn.hero.headline);
  });

  it("returns localized test copy for English", () => {
    const variant = applyLandingHeroHeadlineExperiment(landingCopyEn.hero, "test");
    expect(variant).toEqual(landingCopyEn.hero.testHeadline);
    expect(variant.highlight).toBe("ultimate ad spy tool");
  });

  it("returns localized test copy for German", () => {
    const variant = applyLandingHeroHeadlineExperiment(landingCopyDe.hero, "test");
    expect(variant).toEqual(landingCopyDe.hero.testHeadline);
    expect(variant.highlight).toBe("ultimative ad-spy-tool");
  });

  it("returns localized test copy for Dutch", () => {
    const variant = applyLandingHeroHeadlineExperiment(landingCopyNl.hero, "test");
    expect(variant).toEqual(landingCopyNl.hero.testHeadline);
    expect(variant.highlight).toBe("ultieme ad-spy-tool");
  });
});
