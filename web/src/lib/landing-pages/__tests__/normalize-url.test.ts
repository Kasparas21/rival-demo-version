import { describe, expect, it } from "vitest";
import { displayUrlShort, normalizeLandingPageUrl } from "../normalize-url";

describe("normalizeLandingPageUrl", () => {
  it("strips utm tracking params", () => {
    const result = normalizeLandingPageUrl("https://denticija.lt/page?utm_source=fb&utm_medium=cpc");
    expect(result).toBe("https://denticija.lt/page");
  });

  it("strips fbclid and gclid", () => {
    const result = normalizeLandingPageUrl("https://denticija.lt/page?fbclid=abc123&gclid=xyz");
    expect(result).toBe("https://denticija.lt/page");
  });

  it("removes www prefix", () => {
    const result = normalizeLandingPageUrl("https://www.denticija.lt/page");
    expect(result).toBe("https://denticija.lt/page");
  });

  it("normalizes trailing slash", () => {
    const result = normalizeLandingPageUrl("https://denticija.lt/page/");
    expect(result).toBe("https://denticija.lt/page");
  });

  it("preserves non-tracking query params", () => {
    const result = normalizeLandingPageUrl("https://denticija.lt/page?service=implants");
    expect(result).toBe("https://denticija.lt/page?service=implants");
  });

  it("returns null for invalid URLs", () => {
    expect(normalizeLandingPageUrl("")).toBeNull();
    expect(normalizeLandingPageUrl("not a url")).toBeNull();
  });

  it("adds protocol if missing", () => {
    const result = normalizeLandingPageUrl("denticija.lt/page");
    expect(result).toBe("https://denticija.lt/page");
  });
});

describe("displayUrlShort", () => {
  it("strips protocol", () => {
    expect(displayUrlShort("https://denticija.lt/page")).toBe("denticija.lt/page");
  });

  it("truncates long URLs with ellipsis", () => {
    const long = "https://denticija.lt/naujienos/very-long-path-that-exceeds-display-width";
    const result = displayUrlShort(long, 40);
    expect(result.length).toBeLessThanOrEqual(40);
    expect(result.endsWith("…")).toBe(true);
  });
});
