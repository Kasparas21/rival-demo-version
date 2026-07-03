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
});
