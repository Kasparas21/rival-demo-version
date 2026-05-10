import { describe, expect, it } from "vitest";
import {
  buildMetaAdLibraryUrl,
  canonicalLinkedInAdLibraryUrl,
  canonicalMetaAdsLibraryUrl,
  extractMetaAdsLibraryPageId,
} from "@/lib/ad-library/canonical-library-url";

describe("canonicalMetaAdsLibraryUrl", () => {
  const pageId = "1234567890123";

  it("rebuilds neutral URL and strips extra query params", () => {
    const messy = `https://www.facebook.com/ads/library/?active_status=active&ad_type=political_and_issue_ads&country=US&q=coffee&view_all_page_id=${pageId}`;
    expect(canonicalMetaAdsLibraryUrl(messy)).toBe(buildMetaAdLibraryUrl(pageId));
  });

  it("accepts bare numeric page id", () => {
    expect(canonicalMetaAdsLibraryUrl(pageId)).toBe(buildMetaAdLibraryUrl(pageId));
  });

  it("returns null for single-ad id parameter", () => {
    expect(canonicalMetaAdsLibraryUrl("https://www.facebook.com/ads/library/?id=123")).toBeNull();
  });

  it("returns null for keyword-only library URL", () => {
    expect(canonicalMetaAdsLibraryUrl("https://www.facebook.com/ads/library/?q=brand&search_type=keyword")).toBeNull();
  });

  it("extractMetaAdsLibraryPageId matches canonical", () => {
    const raw = `https://m.facebook.com/ads/library/?view_all_page_id=${pageId}&country=FR`;
    expect(extractMetaAdsLibraryPageId(raw)).toBe(pageId);
  });

  it("parses view_all_page_id when sort_data bracket params are present (public Ad Library share URL)", () => {
    const raw =
      "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=page&sort_data[direction]=desc&sort_data[mode]=total_impressions&view_all_page_id=182162001806727";
    expect(canonicalMetaAdsLibraryUrl(raw)).toBe(buildMetaAdLibraryUrl("182162001806727"));
    expect(extractMetaAdsLibraryPageId(raw)).toBe("182162001806727");
  });
});

describe("canonicalLinkedInAdLibraryUrl", () => {
  it("keeps only companyIds bracket params", () => {
    const raw =
      "https://www.linkedin.com/ad-library/search?companyIds%5B0%5D=999&countries=List%28US%29&dateOption=last-30-days";
    expect(canonicalLinkedInAdLibraryUrl(raw)).toBe("https://www.linkedin.com/ad-library/search?companyIds%5B0%5D=999");
  });

  it("mirrors accountOwner into keyword for advertiser search", () => {
    expect(canonicalLinkedInAdLibraryUrl("https://www.linkedin.com/ad-library/search?accountOwner=nike")).toBe(
      "https://www.linkedin.com/ad-library/search?accountOwner=nike&keyword=nike",
    );
  });

  it("accountOwner canonical URL sets keyword to advertiser (drops unrelated filters)", () => {
    const raw =
      "https://www.linkedin.com/ad-library/search?accountOwner=acme-corp&countries=List%28GB%29&keyword=noise";
    expect(canonicalLinkedInAdLibraryUrl(raw)).toBe(
      "https://www.linkedin.com/ad-library/search?accountOwner=acme-corp&keyword=acme-corp",
    );
  });

  it("keyword-only search drops other filters", () => {
    const raw = "https://www.linkedin.com/ad-library/search?keyword=Acme&countries=US&dateOption=all";
    expect(canonicalLinkedInAdLibraryUrl(raw)).toBe("https://www.linkedin.com/ad-library/search?keyword=Acme");
  });

  it("detail URLs drop query string", () => {
    const raw = "https://www.linkedin.com/ad-library/detail/364864166?trk=foo#bar";
    expect(canonicalLinkedInAdLibraryUrl(raw)).toBe("https://www.linkedin.com/ad-library/detail/364864166");
  });

  it("normalizes company profile URL", () => {
    expect(canonicalLinkedInAdLibraryUrl("https://www.linkedin.com/company/foo-bar/?trk=abc")).toBe(
      "https://www.linkedin.com/company/foo-bar",
    );
  });
});
