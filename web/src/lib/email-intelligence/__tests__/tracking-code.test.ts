import { describe, expect, it } from "vitest";

import {
  buildTrackingCode,
  parseTrackingCodeFromAddress,
  sanitizeSlugForTracking,
} from "../tracking-code";

describe("sanitizeSlugForTracking", () => {
  it("lowercases and replaces dots with hyphens", () => {
    expect(sanitizeSlugForTracking("Skims.com")).toBe("skims-com");
  });

  it("collapses non-alphanumeric runs", () => {
    expect(sanitizeSlugForTracking("  Foo Bar!!  ")).toBe("foo-bar");
  });
});

describe("buildTrackingCode", () => {
  it("matches rival-{6 alnum}-{slug} format", () => {
    const code = buildTrackingCode("skims.com");
    expect(code).toMatch(/^rival-[a-z0-9]{6}-skims-com$/);
  });
});

describe("parseTrackingCodeFromAddress", () => {
  it("extracts local-part from first recipient", () => {
    expect(
      parseTrackingCodeFromAddress(["rival-abc123-skims-com@whxila.resend.app"]),
    ).toBe("rival-abc123-skims-com");
  });

  it("returns null for empty recipients", () => {
    expect(parseTrackingCodeFromAddress([])).toBeNull();
    expect(parseTrackingCodeFromAddress(undefined)).toBeNull();
  });
});
