import { describe, expect, it } from "vitest";

import {
  getLandingHeroVariantFromDistinctId,
  getPostHogFlagValueForHeroVariant,
  parseLandingHeroVariantCookie,
} from "@/lib/analytics/landing-hero-bucket";

describe("landing-hero-bucket", () => {
  it("returns a stable variant for the same distinct id", () => {
    const first = getLandingHeroVariantFromDistinctId("user-abc-123");
    const second = getLandingHeroVariantFromDistinctId("user-abc-123");
    expect(first).toBe(second);
  });

  it("maps test variant to PostHog flag value", () => {
    expect(getPostHogFlagValueForHeroVariant("test")).toBe("example-variant");
    expect(getPostHogFlagValueForHeroVariant("control")).toBe("control");
  });

  it("parses hero variant cookies", () => {
    expect(parseLandingHeroVariantCookie("test")).toBe("test");
    expect(parseLandingHeroVariantCookie("control")).toBe("control");
    expect(parseLandingHeroVariantCookie("invalid")).toBeNull();
  });
});
