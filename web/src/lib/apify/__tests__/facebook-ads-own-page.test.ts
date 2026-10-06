import { afterEach, describe, expect, it, vi } from "vitest";

const runApifyActor = vi.fn();
vi.mock("@/lib/apify/client", () => ({
  runApifyActor: (...args: unknown[]) => runApifyActor(...args),
  ApifyRunnerError: class extends Error {},
}));

import { scrapeFacebookAds } from "@/lib/apify/facebook-ads";
import { isMetaKeywordSearchUrl } from "@/lib/ad-library/meta-keyword-search-url";
import { validateIdentifierField } from "@/lib/validate-identifier-field";

const ROTHYS_PAGE = "123456789012345";

function row(id: string, pageId: string, pageName: string) {
  return { ad_archive_id: id, page_id: pageId, page_name: pageName, snapshot: { body: { text: `ad ${id}` } } };
}

const MIXED = [
  row("1", ROTHYS_PAGE, "Rothy's"),
  row("2", "999999999999999", "Anthropologie"),
  row("3", "888888888888888", "Shop TODAY"),
  row("4", ROTHYS_PAGE, "Rothy's"),
];

afterEach(() => runApifyActor.mockReset());

describe("isMetaKeywordSearchUrl", () => {
  it("spots keyword searches but not page links", () => {
    expect(
      isMetaKeywordSearchUrl("https://www.facebook.com/ads/library/?q=rothys&search_type=keyword_unordered&country=US"),
    ).toBe(true);
    expect(
      isMetaKeywordSearchUrl(`https://www.facebook.com/ads/library/?view_all_page_id=${ROTHYS_PAGE}&search_type=page`),
    ).toBe(false);
    expect(isMetaKeywordSearchUrl("https://www.facebook.com/rothys")).toBe(false);
  });
});

describe("validateIdentifierField (meta)", () => {
  it("warns on keyword-search links instead of blocking", () => {
    const r = validateIdentifierField("meta", "https://www.facebook.com/ads/library/?q=rothys&search_type=keyword_unordered");
    expect(r.valid).toBe(false);
    expect("warning" in r).toBe(true);
  });

  it("accepts page links and bare page ids", () => {
    expect(validateIdentifierField("meta", `https://www.facebook.com/ads/library/?view_all_page_id=${ROTHYS_PAGE}`)).toEqual({
      valid: true,
    });
    expect(validateIdentifierField("meta", ROTHYS_PAGE)).toEqual({ valid: true });
  });
});

describe("scrapeFacebookAds keeps only the competitor's own ads", () => {
  it("drops other pages when a page id is saved", async () => {
    runApifyActor.mockResolvedValue({ items: MIXED });
    const ads = await scrapeFacebookAds({
      ids: { metaPageUrl: `https://www.facebook.com/ads/library/?view_all_page_id=${ROTHYS_PAGE}` },
      brandName: "Rothy's",
      maxAds: 10,
    });
    expect(ads.map((a) => a.pageName)).toEqual(["Rothy's", "Rothy's"]);
  });

  it("keeps only the brand's page for a pasted keyword search", async () => {
    runApifyActor.mockResolvedValue({ items: MIXED });
    const ads = await scrapeFacebookAds({
      ids: { meta: "https://www.facebook.com/ads/library/?q=rothys&search_type=keyword_unordered" },
      brandName: "The World's Most Comfortable Shoes",
      brandDomain: "rothys.com",
      maxAds: 10,
    });
    expect(ads.map((a) => a.pageName)).toEqual(["Rothy's", "Rothy's"]);
  });

  it("keeps only the brand's page for the brand-name fallback search", async () => {
    runApifyActor.mockResolvedValue({ items: MIXED });
    const ads = await scrapeFacebookAds({ ids: {}, brandName: "Rothys", maxAds: 10 });
    expect(ads.map((a) => a.pageName)).toEqual(["Rothy's", "Rothy's"]);
    const input = runApifyActor.mock.calls[0]![1] as { urls: { url: string }[]; count: number };
    expect(isMetaKeywordSearchUrl(input.urls[0]!.url)).toBe(true);
    expect(input.count).toBeGreaterThanOrEqual(30);
  });

  it("does not filter a plain Facebook page link (the actor already scopes it)", async () => {
    runApifyActor.mockResolvedValue({ items: MIXED });
    const ads = await scrapeFacebookAds({ ids: { metaPageUrl: "https://www.facebook.com/rothys" }, brandName: "Rothys", maxAds: 10 });
    expect(ads).toHaveLength(4);
  });
});
