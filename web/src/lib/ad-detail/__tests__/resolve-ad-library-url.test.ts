import { describe, expect, it } from "vitest";

import {
  resolveAdLibrarySourceUrl,
  resolveGoogleAdRowTransparencyHref,
} from "@/lib/ad-detail/resolve-ad-library-url";
import type { GoogleAdRow } from "@/lib/ad-library/normalize";

describe("resolveAdLibrarySourceUrl — Google / YouTube", () => {
  it("returns per-creative Transparency URL when adUrl is advertiser account only", () => {
    const url = resolveAdLibrarySourceUrl("google", {
      id: "g:AR05343765221255151617:CR17553116694019309569",
      type: "google",
      adUrl: "https://adstransparency.google.com/advertiser/AR05343765221255151617",
      advertiserId: "AR05343765221255151617",
      creativeId: "CR17553116694019309569",
    });
    expect(url).toBe(
      "https://adstransparency.google.com/advertiser/AR05343765221255151617/creative/CR17553116694019309569"
    );
  });

  it("prefers creativeUrl over advertiser account adUrl", () => {
    const url = resolveAdLibrarySourceUrl("google", {
      creativeUrl:
        "https://adstransparency.google.com/advertiser/AR1/creative/CR99?region=PL",
      adUrl: "https://adstransparency.google.com/advertiser/AR1",
    });
    expect(url).toContain("/advertiser/AR1/creative/CR99");
  });

  it("does not return domain-search Transparency URLs", () => {
    const url = resolveAdLibrarySourceUrl("google", {
      adUrl: "https://adstransparency.google.com/?region=any&domain=puma.com",
      advertiserId: "AR1",
      creativeId: "CR2",
    });
    expect(url).toBe("https://adstransparency.google.com/advertiser/AR1/creative/CR2");
  });

  it("keeps creative adUrl when already present", () => {
    const creative =
      "https://adstransparency.google.com/advertiser/AR123/creative/CR456?region=PL";
    expect(resolveAdLibrarySourceUrl("google", { adUrl: creative })).toBe(creative);
  });
});

describe("resolveAdLibrarySourceUrl — Meta", () => {
  it("uses ad_archive_id for library detail URL", () => {
    expect(
      resolveAdLibrarySourceUrl("meta", {
        ad_archive_id: "26493469133670382",
        id: "99988877766655544",
      })
    ).toBe("https://www.facebook.com/ads/library/?id=26493469133670382");
  });

  it("does not build a URL from collation-only id", () => {
    expect(
      resolveAdLibrarySourceUrl("meta", {
        id: "99988877766655544",
        adLibraryUrl: "https://www.facebook.com/ads/library/",
      })
    ).toBeNull();
  });
});

describe("resolveGoogleAdRowTransparencyHref", () => {
  it("builds creative URL from stable row id when adUrl is account-only", () => {
    const ad = {
      type: "google",
      id: "g:AR1:CR2",
      title: "t",
      url: "puma.com",
      desc: "",
      img: null,
      adUrl: "https://adstransparency.google.com/advertiser/AR1",
    } satisfies Extract<GoogleAdRow, { type: "google" }>;

    expect(resolveGoogleAdRowTransparencyHref(ad, "puma.com")).toBe(
      "https://adstransparency.google.com/advertiser/AR1/creative/CR2"
    );
  });
});
