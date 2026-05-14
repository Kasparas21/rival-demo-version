import { describe, expect, it } from "vitest";

import { coerceStrategyPlatformForDisplay, normalizePlatform } from "@/lib/strategy-overview/brand-scale-score";
import { sanitizeJsonValue } from "@/lib/json/sanitize-json-for-db";

describe("sanitizeJsonValue", () => {
  it("removes lone high surrogate", () => {
    const s = "bad\uD800end";
    expect(sanitizeJsonValue(s)).toBe("badend");
  });

  it("removes lone low surrogate", () => {
    const s = "x\uDC00y";
    expect(sanitizeJsonValue(s)).toBe("xy");
  });

  it("preserves valid surrogate pairs", () => {
    const s = "emoji\uD83D\uDE00";
    expect(sanitizeJsonValue(s)).toBe("emoji😀");
  });

  it("recurses objects and arrays", () => {
    expect(sanitizeJsonValue({ a: ["x\uD800"] })).toEqual({ a: ["x"] });
  });
});

describe("normalizePlatform", () => {
  it("maps youtube and microsoft to google", () => {
    expect(normalizePlatform("youtube")).toBe("google");
    expect(normalizePlatform("Microsoft")).toBe("google");
    expect(normalizePlatform("bing")).toBe("google");
  });

  it("maps facebook family to meta", () => {
    expect(normalizePlatform("Facebook")).toBe("meta");
    expect(normalizePlatform("instagram")).toBe("meta");
  });
});

describe("coerceStrategyPlatformForDisplay", () => {
  it("falls back to meta for unknown strings", () => {
    expect(coerceStrategyPlatformForDisplay("")).toBe("meta");
    expect(coerceStrategyPlatformForDisplay("unknown-platform")).toBe("meta");
  });
});
