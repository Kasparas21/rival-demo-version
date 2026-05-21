import { describe, expect, it } from "vitest";

import {
  metaLibraryItemLookupKeys,
  metaPreviewUrlFromMap,
  metaScrapedRowMatchesLibraryItemId,
} from "@/lib/ad-library/meta-library-item-keys";
import type { MetaAdCard } from "@/lib/ad-library/normalize";

function baseMeta(over: Partial<MetaAdCard> = {}): MetaAdCard {
  return {
    id: "fb-2",
    headline: "h",
    desc: "d",
    cta: "c",
    subtext: "",
    img: "",
    isVideo: false,
    adLibraryUrl: "https://www.facebook.com/ads/library/?id=123456789",
    pageName: "P",
    ...over,
  };
}

describe("meta-library-item-keys", () => {
  it("includes fallback id, stable archive id, and library url id", () => {
    expect(metaLibraryItemLookupKeys(baseMeta())).toEqual(
      expect.arrayContaining(["fb-2", "123456789"]),
    );
  });

  it("resolves preview urls across alias keys", () => {
    const url = metaPreviewUrlFromMap(baseMeta(), {
      "meta:123456789": "https://scontent.xx.fbcdn.net/v/shoe.jpg",
    });
    expect(url).toBe("https://scontent.xx.fbcdn.net/v/shoe.jpg");
  });

  it("matches scraped rows to client library ids", () => {
    const clientCard = baseMeta();
    expect(metaScrapedRowMatchesLibraryItemId(clientCard, "fb-2")).toBe(true);
    expect(metaScrapedRowMatchesLibraryItemId(clientCard, "123456789")).toBe(true);
    expect(metaScrapedRowMatchesLibraryItemId(clientCard, "999")).toBe(false);
  });
});
