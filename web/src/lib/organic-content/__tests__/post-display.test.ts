import { describe, expect, it } from "vitest";

import { organicPostDisplayFields, enrichOrganicPostForApi } from "../post-display";

const calaiFeedPost = {
  code: "DGecL_zS9uv",
  product_type: "feed",
  post_url: "https://www.instagram.com/p/DGecL_zS9uv/",
  original_width: 1440,
  original_height: 1796,
  user: {
    username: "calai.app",
    full_name: "Cal AI - Calorie Tracker",
    profile_pic_url: "https://instagram.example/avatar.jpg",
  },
};

const calaiReelPost = {
  code: "DH6_cQ5OIpt",
  product_type: "clips",
  post_url: "https://www.instagram.com/p/DH6_cQ5OIpt/",
  original_width: 1080,
  original_height: 1920,
  user: {
    username: "shinnyyy2.0",
    full_name: "Eric Shindel",
    profile_pic_url: "https://instagram.example/shinny.jpg",
  },
};

describe("organicPostDisplayFields author extraction", () => {
  it("extracts Instagram feed author and square aspect", () => {
    expect(organicPostDisplayFields(calaiFeedPost, "instagram")).toMatchObject({
      post_url: "https://www.instagram.com/p/DGecL_zS9uv/",
      product_type: "feed",
      author_username: "calai.app",
      author_display_name: "Cal AI - Calorie Tracker",
      author_avatar_url: "https://instagram.example/avatar.jpg",
      media_aspect: "square",
    });
  });

  it("extracts Instagram reel author and vertical aspect", () => {
    expect(organicPostDisplayFields(calaiReelPost, "instagram")).toMatchObject({
      product_type: "clips",
      author_username: "shinnyyy2.0",
      author_display_name: "Eric Shindel",
      media_aspect: "vertical",
    });
  });

  it("defaults TikTok to vertical when raw_data is missing", () => {
    expect(organicPostDisplayFields(null, "tiktok")).toMatchObject({
      media_aspect: "vertical",
      author_username: null,
    });
  });

  it("defaults YouTube to landscape", () => {
    expect(
      organicPostDisplayFields(
        { channelName: "Tech Channel", channelUsername: "techchannel" },
        "youtube",
      ),
    ).toMatchObject({
      author_username: "techchannel",
      author_display_name: "Tech Channel",
      media_aspect: "landscape",
    });
  });

  it("extracts scrapesmith YouTube fields", () => {
    expect(
      organicPostDisplayFields(
        {
          video_url: "https://www.youtube.com/watch?v=mJJY53qhJe0",
          channel_name: "adidas",
          channel_url: "https://www.youtube.com/@adidas",
          product_type: "video",
        },
        "youtube",
      ),
    ).toMatchObject({
      post_url: "https://www.youtube.com/watch?v=mJJY53qhJe0",
      author_display_name: "adidas",
      author_username: "https://www.youtube.com/@adidas",
      product_type: "video",
      media_aspect: "landscape",
    });
  });

  it("extracts xtdata Twitter author and vertical aspect from extended_entities", () => {
    expect(
      organicPostDisplayFields(
        {
          url: "https://x.com/adidas/status/2069772479283810730",
          author: {
            screen_name: "adidas",
            name: "adidas",
            profile_image_url_https: "https://pbs.twimg.com/profile_images/2052302029268164609/YAtZ75Su_normal.jpg",
          },
          extended_entities: {
            media: [{ original_info: { width: 1080, height: 1440 } }],
          },
        },
        "twitter",
      ),
    ).toMatchObject({
      post_url: "https://x.com/adidas/status/2069772479283810730",
      author_username: "adidas",
      author_display_name: "adidas",
      author_avatar_url: "https://pbs.twimg.com/profile_images/2052302029268164609/YAtZ75Su_normal.jpg",
      media_aspect: "vertical",
    });
  });

  it("re-extracts Twitter views from raw_data when stored views are zero", () => {
    expect(
      enrichOrganicPostForApi({
        platform: "twitter",
        views: 0,
        raw_data: {
          full_text: "Hello",
          views: { count: "12345" },
        },
      }).views,
    ).toBe(12345);
  });
});
