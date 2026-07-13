import { describe, expect, it } from "vitest";

import { enrichOrganicPostForApi } from "../post-display";
import { extractFacebookMediaFromRaw, normalizeOrganicItem } from "../normalize";

const adidasReelSample = {
  postId: "1443381101146942",
  url: "https://www.facebook.com/reel/1686773485863378/",
  text: "Backyard legends were made at Shanghai's West Bund. #YouGotThis",
  pageName: "adidas",
  likes: "330",
  comments: "24",
  shares: "37",
  time: "2026-06-25T12:00:00.000Z",
  media: [
    {
      id: "1686773485863378",
      url: "https://www.facebook.com/reel/1686773485863378/",
      thumbnail:
        "https://scontent-iad6-1.xx.fbcdn.net/v/t51.71878-10/728855224_957361984018767_2233840895326139628_n.jpg?stp=dst-jpg",
      thumbnailImage: {
        uri: "https://scontent-iad6-1.xx.fbcdn.net/v/t51.71878-10/728855224_957361984018767_2233840895326139628_n.jpg?stp=dst-jpg",
      },
      width: 1080,
      height: 1920,
      __typename: "Video",
      permalink_url: "https://www.facebook.com/reel/1686773485863378/",
    },
  ],
};

const adidasMultiPhotoSample = {
  postId: "multi-photo-1",
  url: "https://www.facebook.com/adidas/posts/123",
  text: "Tate McRae delivers the Trionda match ball",
  pageName: "adidas",
  likes: "7700",
  comments: "90",
  shares: "261",
  time: "2026-07-11T12:00:00.000Z",
  media: [
    {
      id: "photo-1",
      __typename: "Photo",
      width: 1080,
      height: 1350,
      image: { uri: "https://scontent.xx.fbcdn.net/v/photo-1-full.jpg" },
      thumbnail: "https://scontent.xx.fbcdn.net/v/photo-1-thumb.jpg",
    },
    {
      id: "photo-2",
      __typename: "Photo",
      width: 1080,
      height: 1350,
      image: { uri: "https://scontent.xx.fbcdn.net/v/photo-2-full.jpg" },
      thumbnail: "https://scontent.xx.fbcdn.net/v/photo-2-thumb.jpg",
    },
    {
      id: "photo-3",
      __typename: "Photo",
      width: 1080,
      height: 1350,
      image: { uri: "https://scontent.xx.fbcdn.net/v/photo-3-full.jpg" },
      thumbnail: "https://scontent.xx.fbcdn.net/v/photo-3-thumb.jpg",
    },
  ],
};

describe("normalizeFacebookPost", () => {
  it("uses fbcdn thumbnail instead of facebook reel page url", () => {
    const normalized = normalizeOrganicItem("facebook", adidasReelSample, 0);
    expect(normalized?.media_urls[0]).toContain("scontent-iad6-1.xx.fbcdn.net");
    expect(normalized?.media_urls[0]).not.toContain("facebook.com/reel");
    expect(normalized?.post_id).toBe("1443381101146942");
    expect(normalized?.raw_data).toMatchObject({
      product_type: "reel",
      post_url: "https://www.facebook.com/reel/1686773485863378/",
    });
  });

  it("extractFacebookMediaFromRaw repairs stored reel urls for API responses", () => {
    const urls = extractFacebookMediaFromRaw(adidasReelSample);
    expect(urls[0]).toContain("fbcdn.net");
    expect(
      enrichOrganicPostForApi({
        platform: "facebook",
        media_urls: ["https://www.facebook.com/reel/1686773485863378/"],
        raw_data: adidasReelSample,
      }).media_urls[0],
    ).toContain("fbcdn.net");
  });

  it("extracts all carousel photos preferring full image.uri over thumbnail", () => {
    const normalized = normalizeOrganicItem("facebook", adidasMultiPhotoSample, 0);
    expect(normalized?.media_urls).toEqual([
      "https://scontent.xx.fbcdn.net/v/photo-1-full.jpg",
      "https://scontent.xx.fbcdn.net/v/photo-2-full.jpg",
      "https://scontent.xx.fbcdn.net/v/photo-3-full.jpg",
    ]);
    expect(normalized?.raw_data).toMatchObject({ product_type: "carousel" });
  });

  it("extractFacebookMediaFromRaw returns multiple distinct photo urls", () => {
    const urls = extractFacebookMediaFromRaw(adidasMultiPhotoSample);
    expect(urls).toHaveLength(3);
    expect(urls.every((u) => u.includes("-full.jpg"))).toBe(true);
  });

  it("excludes page profile picture when post has multiple photos", () => {
    const pageLogo = "https://scontent.xx.fbcdn.net/v/page-logo.jpg";
    const sample = {
      ...adidasMultiPhotoSample,
      pageProfilePicture: pageLogo,
      media_urls: [pageLogo, ...adidasMultiPhotoSample.media.map((m) => m.image.uri)],
    };
    const normalized = normalizeOrganicItem("facebook", sample, 0);
    expect(normalized?.media_urls).toHaveLength(3);
    expect(normalized?.media_urls.some((u) => u.includes("page-logo"))).toBe(false);
    expect(
      enrichOrganicPostForApi({
        platform: "facebook",
        media_urls: [pageLogo, ...adidasMultiPhotoSample.media.map((m) => m.image.uri)],
        archived_preview_url: pageLogo,
        raw_data: sample,
      }).media_urls.some((u) => u.includes("page-logo")),
    ).toBe(false);
  });

  it("does not duplicate photos from attachments when media array is present", () => {
    const sample = {
      ...adidasMultiPhotoSample,
      attachments: [
        {
          media: { image: { uri: "https://scontent.xx.fbcdn.net/v/photo-1-thumb.jpg" } },
          subattachments: adidasMultiPhotoSample.media.map((m) => ({
            media: { image: { uri: m.image.uri } },
          })),
        },
      ],
    };
    expect(extractFacebookMediaFromRaw(sample)).toHaveLength(3);
  });

  it("dedupes archived preview already present in media_urls", () => {
    const photo1 = "https://scontent.xx.fbcdn.net/v/photo-1-full.jpg";
    const archived = "https://project.supabase.co/storage/v1/object/public/organic-media/u/c/facebook/x.jpg";
    const enriched = enrichOrganicPostForApi({
      platform: "facebook",
      media_urls: [archived, photo1, "https://scontent.xx.fbcdn.net/v/photo-2-full.jpg"],
      archived_preview_url: archived,
      raw_data: adidasMultiPhotoSample,
    });
    expect(enriched.media_urls.filter((u) => u === archived)).toHaveLength(1);
    expect(enriched.media_urls).toHaveLength(3);
  });
});
