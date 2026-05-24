import { describe, expect, it } from "vitest";

import { PENDING_SAVED_AD_ID, buildSavedAdsCheckQueryKey, isAdSaved, isLibraryItemSaved } from "@/lib/saved-ads/use-saved-ads";
import { libraryItemKey } from "@/lib/saved-ads/resolve-scraped-ad";

describe("use-saved-ads helpers", () => {
  it("isAdSaved returns false for empty id", () => {
    expect(isAdSaved({ a: "1" }, "")).toBe(false);
  });

  it("isAdSaved respects map", () => {
    expect(isAdSaved({ x: "saved-row" }, "x")).toBe(true);
    expect(isAdSaved({ x: "saved-row" }, "y")).toBe(false);
  });

  it("isAdSaved treats optimistic pending as saved for UI", () => {
    expect(isAdSaved({ x: PENDING_SAVED_AD_ID }, "x")).toBe(true);
  });

  it("isLibraryItemSaved checks all resolved aliases", () => {
    const resolved = { "meta:archive-id": "scraped-1" };
    expect(isLibraryItemSaved({ "scraped-1": "saved-row" }, resolved, "meta", "card-id", ["archive-id"])).toBe(
      true,
    );
    expect(isLibraryItemSaved({}, resolved, "meta", "card-id", ["archive-id"])).toBe(false);
  });
});

describe("buildSavedAdsCheckQueryKey", () => {
  it("is stable regardless of library item order", () => {
    const a = buildSavedAdsCheckQueryKey(
      "cid-1",
      [
        { platform: "meta", libraryItemId: "b" },
        { platform: "tiktok", libraryItemId: "a" },
      ],
      ["z", "y"],
    );
    const b = buildSavedAdsCheckQueryKey(
      "cid-1",
      [
        { platform: "tiktok", libraryItemId: "a" },
        { platform: "meta", libraryItemId: "b" },
      ],
      ["y", "z"],
    );
    expect(a).toBe(b);
  });

  it("changes when visible ad ids change", () => {
    const base = buildSavedAdsCheckQueryKey("cid-1", [{ platform: "meta", libraryItemId: "1" }]);
    const next = buildSavedAdsCheckQueryKey("cid-1", [{ platform: "meta", libraryItemId: "2" }]);
    expect(base).not.toBe(next);
  });
});

describe("libraryItemKey", () => {
  it("normalizes platform casing and whitespace", () => {
    expect(libraryItemKey(" Meta ", " abc ")).toBe("meta:abc");
  });
});
