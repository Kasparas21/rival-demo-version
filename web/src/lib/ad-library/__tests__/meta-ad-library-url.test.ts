import { describe, expect, it } from "vitest";

import {
  buildMetaAdLibraryDetailUrl,
  resolveMetaAdLibraryUrlFromPayload,
  resolveMetaArchiveIdFromPayload,
} from "@/lib/ad-library/meta-ad-library-url";

describe("resolveMetaArchiveIdFromPayload", () => {
  it("prefers ad_archive_id over collation id in id field", () => {
    expect(
      resolveMetaArchiveIdFromPayload({
        ad_archive_id: "26493469133670382",
        id: "99988877766655544",
        adLibraryUrl: "https://www.facebook.com/ads/library/?id=26493469133670382",
      })
    ).toBe("26493469133670382");
  });

  it("rejects collation-only id without corroborating archive field or library URL", () => {
    expect(
      resolveMetaArchiveIdFromPayload({
        id: "99988877766655544",
        adLibraryUrl: "https://www.facebook.com/ads/library/",
      })
    ).toBeNull();
  });

  it("accepts id when it matches library URL archive param", () => {
    expect(
      resolveMetaArchiveIdFromPayload({
        id: "26493469133670382",
        adLibraryUrl: "https://www.facebook.com/ads/library/?id=26493469133670382",
      })
    ).toBe("26493469133670382");
  });

  it("rejects synthetic fb-N ids", () => {
    expect(resolveMetaArchiveIdFromPayload({ id: "fb-12" })).toBeNull();
  });
});

describe("resolveMetaAdLibraryUrlFromPayload", () => {
  it("builds canonical detail URL from archive id", () => {
    expect(
      resolveMetaAdLibraryUrlFromPayload({
        ad_archive_id: "26493469133670382",
      })
    ).toBe("https://www.facebook.com/ads/library/?id=26493469133670382");
  });

  it("returns null when only collation id is present", () => {
    expect(
      resolveMetaAdLibraryUrlFromPayload({
        id: "99988877766655544",
      })
    ).toBeNull();
  });
});

describe("buildMetaAdLibraryDetailUrl", () => {
  it("returns library home for invalid ids", () => {
    expect(buildMetaAdLibraryDetailUrl("fb-3")).toBe("https://www.facebook.com/ads/library/");
  });
});
