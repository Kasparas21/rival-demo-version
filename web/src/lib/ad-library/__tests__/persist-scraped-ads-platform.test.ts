import { describe, expect, it } from "vitest";

import { libraryPlatformHasActiveScrapedRows } from "@/lib/ad-library/persist-scraped-ads";

describe("libraryPlatformHasActiveScrapedRows", () => {
  it("treats google library platform as present when youtube rows exist", () => {
    const existing = new Set(["youtube"]);
    expect(libraryPlatformHasActiveScrapedRows("google", existing)).toBe(true);
  });

  it("returns false when no matching db platform rows exist", () => {
    const existing = new Set(["meta"]);
    expect(libraryPlatformHasActiveScrapedRows("tiktok", existing)).toBe(false);
    expect(libraryPlatformHasActiveScrapedRows("google", existing)).toBe(false);
  });
});
