import { describe, expect, it } from "vitest";

import { isCheckoutNavigationHref } from "@/lib/analytics/meta-pixel";

describe("isCheckoutNavigationHref", () => {
  it("matches checkout and billing API paths", () => {
    expect(isCheckoutNavigationHref("/checkout")).toBe(true);
    expect(isCheckoutNavigationHref("/checkout?plan=pro&period=annual")).toBe(true);
    expect(isCheckoutNavigationHref("/api/billing/checkout?plan=starter")).toBe(true);
    expect(isCheckoutNavigationHref("/api/billing/upgrade")).toBe(true);
  });

  it("ignores unrelated routes", () => {
    expect(isCheckoutNavigationHref("/login")).toBe(false);
    expect(isCheckoutNavigationHref("/api/billing/portal")).toBe(false);
    expect(isCheckoutNavigationHref("/dashboard/settings")).toBe(false);
  });
});
