import { describe, expect, it } from "vitest";

import {
  DEFAULT_META_PIXEL_ID,
  getMetaPixelId,
  isCheckoutNavigationHref,
} from "@/lib/analytics/meta-pixel";

describe("getMetaPixelId", () => {
  it("returns default pixel id when env is unset", () => {
    const prev = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    expect(getMetaPixelId()).toBe(DEFAULT_META_PIXEL_ID);
    if (prev !== undefined) process.env.NEXT_PUBLIC_META_PIXEL_ID = prev;
  });
});

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
