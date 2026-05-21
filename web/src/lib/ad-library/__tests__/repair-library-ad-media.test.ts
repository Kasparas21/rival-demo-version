import { describe, expect, it } from "vitest";

import {
  repairAdsLibraryResponseMedia,
  repairMetaAdCardMedia,
  repairTikTokAdCardMedia,
} from "@/lib/ad-library/repair-library-ad-media";
import { deepFindMetaPreviewUrl, facebookItemToMetaCard } from "@/lib/ad-library/normalize";

describe("repair-library-ad-media", () => {
  it("repairs Meta img from top-level image_url on cached card", () => {
    const ad = {
      id: "m1",
      headline: "h",
      desc: "d",
      cta: "c",
      subtext: "",
      img: "",
      isVideo: false,
      adLibraryUrl: "https://www.facebook.com/ads/library/?id=m1",
      pageName: "P",
      image_url: "https://cdn.example.com/meta.jpg",
    };
    const repaired = repairMetaAdCardMedia(
      ad as unknown as Parameters<typeof repairMetaAdCardMedia>[0],
    );
    expect(repaired.img).toBe("https://cdn.example.com/meta.jpg");
  });

  it("repairs TikTok img from nested preview fields", () => {
    const ad = {
      id: "tt1",
      headline: "h",
      desc: "d",
      url: "u",
      img: "",
      advertiser: "a",
      adUrl: "https://library.tiktok.com/ads/detail/tt1",
      previewUrl: "https://p16-sign.tiktokcdn.com/preview.jpg",
    };
    const repaired = repairTikTokAdCardMedia(
      ad as unknown as Parameters<typeof repairTikTokAdCardMedia>[0],
    );
    expect(repaired.img).toBe("https://p16-sign.tiktokcdn.com/preview.jpg");
  });

  it("repairs Meta img from nested fbcdn url on cached card", () => {
    const ad = {
      id: "m2",
      headline: "h",
      desc: "d",
      cta: "c",
      subtext: "",
      img: "",
      isVideo: false,
      adLibraryUrl: "https://www.facebook.com/ads/library/?id=m2",
      pageName: "P",
      snapshot: {
        cards: [
          {
            title: "Product",
            link_url: "nike.com",
            original_image_url: "https://scontent.xx.fbcdn.net/v/example.jpg",
          },
        ],
      },
    };
    const repaired = repairMetaAdCardMedia(
      ad as unknown as Parameters<typeof repairMetaAdCardMedia>[0],
    );
    expect(repaired.img).toBe("https://scontent.xx.fbcdn.net/v/example.jpg");
  });

  it("deepFindMetaPreviewUrl finds preview_url in nested payload", () => {
    expect(
      deepFindMetaPreviewUrl({
        snapshot: {
          cards: [{ preview_url: "https://scontent.xx.fbcdn.net/v/shoe.jpg" }],
        },
      }),
    ).toBe("https://scontent.xx.fbcdn.net/v/shoe.jpg");
  });

  it("facebookItemToMetaCard picks image from second carousel card", () => {
    const card = facebookItemToMetaCard(
      {
        ad_archive_id: "123",
        page_name: "Nike",
        snapshot: {
          body: { text: "Shop Nike" },
          display_format: "CAROUSEL",
          cards: [
            { title: "Card one", link_url: "nike.com" },
            {
              title: "Card two",
              original_image_url: "https://scontent.xx.fbcdn.net/v/card-two.jpg",
            },
          ],
        },
      },
      0,
    );
    expect(card?.img).toBe("https://scontent.xx.fbcdn.net/v/card-two.jpg");
  });

  it("repairs Meta and TikTok slots in library response", () => {
    const shell = repairAdsLibraryResponseMedia({
      ok: true,
      configured: true,
      meta: {
        ads: [
          {
            id: "m1",
            headline: "h",
            desc: "d",
            cta: "c",
            subtext: "",
            img: "",
            isVideo: false,
            adLibraryUrl: "https://www.facebook.com/ads/library/?id=m1",
            pageName: "P",
            image_url: "https://cdn.example.com/meta.jpg",
          } as unknown as Parameters<typeof repairMetaAdCardMedia>[0],
        ],
        error: null,
      },
      google: { rows: [], error: null },
      linkedin: { ads: [], error: null },
      tiktok: {
        ads: [
          {
            id: "tt1",
            headline: "h",
            desc: "d",
            url: "u",
            img: "",
            advertiser: "a",
            adUrl: "https://library.tiktok.com/ads/detail/tt1",
            previewUrl: "https://p16-sign.tiktokcdn.com/preview.jpg",
          } as unknown as Parameters<typeof repairTikTokAdCardMedia>[0],
        ],
        error: null,
      },
      microsoft: { ads: [], error: null },
      pinterest: { ads: [], error: null },
      snapchat: { ads: [], error: null },
    });
    expect(shell.meta.ads[0]?.img).toBe("https://cdn.example.com/meta.jpg");
    expect(shell.tiktok.ads[0]?.img).toBe("https://p16-sign.tiktokcdn.com/preview.jpg");
  });
});
