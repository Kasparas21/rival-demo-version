import { describe, expect, it } from "vitest";

import { mcpAdLinksForScrapedRow, mcpSpyRivalAdUrl } from "@/lib/mcp/ad-links";

describe("mcpSpyRivalAdUrl", () => {
  it("builds competitor ads tab deep link with ad drawer param", () => {
    expect(mcpSpyRivalAdUrl("https://app.spyrival.com", "nike.com", "550e8400-e29b-41d4-a716-446655440000")).toBe(
      "https://app.spyrival.com/dashboard/competitor/nike.com?tab=ads&ad=550e8400-e29b-41d4-a716-446655440000",
    );
  });
});

describe("mcpAdLinksForScrapedRow", () => {
  it("returns Meta Ads Library URL from raw_payload", () => {
    const links = mcpAdLinksForScrapedRow(
      "https://app.spyrival.com",
      "nike.com",
      "meta",
      "ad-uuid",
      {
        ad_archive_id: "26493469133670382",
        adLibraryUrl: "https://www.facebook.com/ads/library/?id=26493469133670382",
      },
    );

    expect(links.spy_rival_url).toContain("tab=ads&ad=ad-uuid");
    expect(links.platform_library_url).toBe(
      "https://www.facebook.com/ads/library/?id=26493469133670382",
    );
  });

  it("returns null platform_library_url when archive id is missing", () => {
    const links = mcpAdLinksForScrapedRow(
      "https://app.spyrival.com",
      "nike.com",
      "meta",
      "ad-uuid",
      { id: "99988877766655544" },
    );

    expect(links.platform_library_url).toBeNull();
  });
});
