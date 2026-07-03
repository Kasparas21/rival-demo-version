import { describe, expect, it } from "vitest";

import { normalizeOrganicItem } from "../normalize";
import { organicPostDisplayFields } from "../post-display";

const adidasShort = {
  inputType: "channel",
  inputValue: "https://www.youtube.com/@adidas",
  sourceUrl: "https://www.youtube.com/@adidas/shorts",
  surface: "channel",
  contentType: "short",
  id: "0eNL8uxNKpE",
  url: "https://www.youtube.com/shorts/0eNL8uxNKpE",
  title: "what is bro's story? @IanWright",
  publishedDate: "2026-06-24T10:01:40Z",
  durationSeconds: 10,
  viewCount: 29531,
  likeCount: 1153,
  commentCount: 27,
  thumbnailUrl: "https://i.ytimg.com/vi/0eNL8uxNKpE/frame0.jpg",
  isShort: true,
  details: {
    id: "0eNL8uxNKpE",
    title: "what is bro's story? @IanWright",
    channelId: "UCuLUOxd7ezJ8c6NSLBNRRfg",
    author: "adidas",
    publishDate: "2026-06-24T10:01:40Z",
    viewCount: 29531,
    likeCount: 1153,
    commentCount: 27,
  },
};

describe("normalizeCalmBuilderYouTubePost", () => {
  it("normalizes channel Shorts rows", () => {
    const normalized = normalizeOrganicItem("youtube", adidasShort, 0);
    expect(normalized).toMatchObject({
      platform: "youtube",
      post_id: "0eNL8uxNKpE",
      content: adidasShort.title,
      views: 29531,
      likes: 1153,
      comments: 27,
      media_urls: [adidasShort.thumbnailUrl],
    });
    expect(normalized?.posted_at).toBe("2026-06-24T10:01:40.000Z");
    expect(normalized?.raw_data).toMatchObject({
      product_type: "short",
      video_url: adidasShort.url,
      channel_id: "UCuLUOxd7ezJ8c6NSLBNRRfg",
      channel_name: "adidas",
    });
  });
});

describe("organicPostDisplayFields calm_builder youtube", () => {
  it("extracts Shorts url, author, and vertical aspect", () => {
    const raw = { ...adidasShort, product_type: "short" };
    expect(organicPostDisplayFields(raw, "youtube")).toMatchObject({
      post_url: adidasShort.url,
      author_display_name: "adidas",
      product_type: "short",
      media_aspect: "vertical",
    });
  });
});
