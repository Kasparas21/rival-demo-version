import { describe, expect, it } from "vitest";

import { safeDecodedNextPath, safeNextPath } from "@/lib/auth/safe-next-path";
import { safeAuthNextPath } from "@/lib/auth/auth-page-helpers";
import { resolveAuthCallbackNext } from "@/lib/auth/trial-flow";
import { safeCheckoutNextPath } from "@/lib/billing/checkout-url";

const OFF_SITE = [
  "https://example.com",
  "http:example.com",
  "javascript:alert(1)",
  "//example.com",
  "/\\example.com",
  "\\\\example.com",
  "/\texample.com",
  "/\nexample.com",
  "/..//example.com",
  "/a/../..//example.com",
  "dashboard",
  "",
  "   ",
];

describe("safeNextPath", () => {
  it("keeps same-site paths with their query and hash", () => {
    expect(safeNextPath("/dashboard/spy")).toBe("/dashboard/spy");
    expect(safeNextPath(" /dashboard/spy ")).toBe("/dashboard/spy");
    expect(safeNextPath("/choose-plan?next=%2Fonboarding%3Fphase%3Dpost_payment")).toBe(
      "/choose-plan?next=%2Fonboarding%3Fphase%3Dpost_payment",
    );
    expect(safeNextPath("/dashboard/settings#billing")).toBe("/dashboard/settings#billing");
  });

  it("refuses anything that would leave the site", () => {
    for (const value of OFF_SITE) {
      expect(safeNextPath(value), JSON.stringify(value)).toBeNull();
    }
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });

  it("leaves percent-encoded slashes as a harmless path", () => {
    expect(safeNextPath("/%2F%2Fexample.com")).toBe("/%2F%2Fexample.com");
  });
});

describe("safeDecodedNextPath", () => {
  it("decodes once before checking", () => {
    expect(safeDecodedNextPath("%2Fdashboard%2Fspy")).toBe("/dashboard/spy");
    expect(safeDecodedNextPath("%2F%2Fexample.com")).toBeNull();
    expect(safeDecodedNextPath("%2F%5Cexample.com")).toBeNull();
    expect(safeDecodedNextPath("%E0%A4%A")).toBeNull();
  });
});

describe("callers share the same rules", () => {
  it("login and signup pages", () => {
    expect(safeAuthNextPath("/\\example.com", "/login")).toBeNull();
    expect(safeAuthNextPath("/login", "/login")).toBeNull();
    expect(safeAuthNextPath("/dashboard/spy", "/signup")).toBe("/dashboard/spy");
  });

  it("auth callback, from the query or the OAuth cookie", () => {
    const noCookie = { get: () => undefined };
    expect(resolveAuthCallbackNext("/\\example.com", noCookie)).toBeNull();
    expect(resolveAuthCallbackNext("/dashboard/spy", noCookie)).toBe("/dashboard/spy");
    const evilCookie = { get: () => ({ value: "%2F%5Cexample.com" }) };
    expect(resolveAuthCallbackNext(null, evilCookie)).toBeNull();
  });

  it("checkout", () => {
    expect(safeCheckoutNextPath("/\\example.com")).toBeNull();
    expect(safeCheckoutNextPath("/dashboard/spy")).toBe("/dashboard/spy");
  });
});
