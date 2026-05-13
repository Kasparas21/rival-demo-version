import { describe, expect, it } from "vitest";

import { isAdSaved } from "@/lib/saved-ads/use-saved-ads";
import { libraryItemKey } from "@/lib/saved-ads/resolve-scraped-ad";

describe("use-saved-ads helpers", () => {
  it("isAdSaved returns false for empty id", () => {
    expect(isAdSaved({ a: "1" }, "")).toBe(false);
  });

  it("isAdSaved respects map", () => {
    expect(isAdSaved({ x: "saved-row" }, "x")).toBe(true);
    expect(isAdSaved({ x: "saved-row" }, "y")).toBe(false);
  });
});

describe("libraryItemKey", () => {
  it("normalizes platform casing and whitespace", () => {
    expect(libraryItemKey(" Meta ", " abc ")).toBe("meta:abc");
  });
});
