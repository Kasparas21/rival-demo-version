import { describe, expect, it } from "vitest";

import {
  countryCodeForName,
  googleAdvertiserRows,
  metaSampleFromItem,
  websiteFacebookKeysFromHtml,
} from "@/lib/ad-account-discovery/parse";

describe("websiteFacebookKeysFromHtml", () => {
  it("finds page links in markup and JSON-LD, skipping share and plugin links", () => {
    const html = `
      <a href="https://www.facebook.com/cannumolt/">Facebook</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=https://cannumo.lt">Share</a>
      <iframe src="https://www.facebook.com/plugins/page.php?href=x"></iframe>
      <script type="application/ld+json">{"sameAs":["https:\\/\\/facebook.com\\/Papadentklinika"]}</script>
      <a href="https://m.facebook.com/profile.php?id=61552807384612&amp;ref=x">fb</a>`;
    expect(websiteFacebookKeysFromHtml(html)).toEqual(["cannumolt", "papadentklinika", "61552807384612"]);
  });
});

describe("metaSampleFromItem", () => {
  it("reads the paying page, its link and the targeted countries", () => {
    const item = {
      page_id: "239284672922110",
      page_name: "Odontologijos klinika PAPADENT",
      snapshot: {
        caption: "fb.me",
        link_url: "http://fb.me/",
        page_profile_uri: "https://www.facebook.com/Papadentklinika/",
        branded_content: null,
      },
      aaa_info: {
        location_audience: [
          { name: "Latvia", num_obfuscated: 0, type: "countries", excluded: false },
          { name: "Estonia", type: "countries", excluded: true },
        ],
      },
    };
    expect(metaSampleFromItem(item)).toEqual({
      pageId: "239284672922110",
      pageName: "Odontologijos klinika PAPADENT",
      profileUri: "https://www.facebook.com/Papadentklinika/",
      pictureUrl: null,
      linkHost: "fb.me",
      branded: false,
      countries: ["LV"],
    });
  });

  it("falls back to the caption for the link and flags branded content", () => {
    const s = metaSampleFromItem({
      page_id: "1",
      page_name: "The Cut",
      snapshot: { caption: "rothys.com", branded_content: { page_id: "2" } },
    });
    expect(s?.linkHost).toBe("rothys.com");
    expect(s?.branded).toBe(true);
  });

  it("maps Meta's country names", () => {
    expect(countryCodeForName("United Kingdom")).toBe("GB");
    expect(countryCodeForName("United States")).toBe("US");
    expect(countryCodeForName("Lithuania")).toBe("LT");
  });
});

describe("googleAdvertiserRows", () => {
  it("one entry per advertiser; free preview scripts before images; skips 'no advertiser' rows", () => {
    const rows = googleAdvertiserRows([
      { status: "No advertiser found for domain: cannumo.com.", advertiserId: null },
      {
        advertiserId: "AR05686255499805196289",
        advertiserName: "Rothy's Inc.",
        imageUrl: "https://tpc.googlesyndication.com/archive/simgad/123",
        previewUrl: null,
      },
      {
        advertiserId: "AR05686255499805196289",
        advertiserName: "Rothy's Inc.",
        previewUrl: "https://displayads-formats.googleusercontent.com/ads/preview/content.js?client=x",
      },
      { advertiserId: "AR13133553908590837761", advertiserName: "AYENA SHAMOON LLC", headline: "Rothy's Official Website" },
    ]);
    expect(rows).toEqual([
      {
        advertiserId: "AR05686255499805196289",
        advertiserName: "Rothy's Inc.",
        publishedText: null,
        creatives: [
          { kind: "preview_script", url: "https://displayads-formats.googleusercontent.com/ads/preview/content.js?client=x" },
          { kind: "image", url: "https://tpc.googlesyndication.com/archive/simgad/123" },
        ],
      },
      { advertiserId: "AR13133553908590837761", advertiserName: "AYENA SHAMOON LLC", publishedText: "Rothy's Official Website", creatives: [] },
    ]);
  });
});
