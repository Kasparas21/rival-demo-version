import { describe, expect, it } from "vitest";

import { normalizeOrganicItem } from "../normalize";
import { organicPostDisplayFields } from "../post-display";

const adidasVideo = {
  video_id: "mJJY53qhJe0",
  title: "adidas Backyard Legends | The Greatest Football Story Ever Told",
  views: 7921025,
  likes: 285000,
  comments: 7300,
  duration: "5:06",
  date_posted: "May 7, 2026",
  channel_name: "adidas",
  channel_id: "UCuLUOxd7ezJ8c6NSLBNRRfg",
  channel_url: "https://www.youtube.com/channel/UCuLUOxd7ezJ8c6NSLBNRRfg",
  video_url: "https://www.youtube.com/watch?v=mJJY53qhJe0",
  description: "Where there's a pitch, there's a legend.",
  thumbnail: "https://i.ytimg.com/vi/mJJY53qhJe0/hqdefault.jpg",
  source_input: "adidas",
};

const adidasShort = {
  video_id: "iFlEvRC0S_o",
  title: "Just a few legends putting their skills to the test",
  views: 1100,
  likes: 42,
  comments: 3,
  video_url: "https://www.youtube.com/shorts/iFlEvRC0S_o",
  thumbnail: "https://i.ytimg.com/vi/iFlEvRC0S_o/hqdefault.jpg",
  date_posted: "Jun 1, 2026",
  channel_name: "adidas",
  channel_url: "https://www.youtube.com/@adidas",
};

describe("normalizeScrapesmithYouTubePost", () => {
  it("normalizes long-form video rows", () => {
    const normalized = normalizeOrganicItem("youtube", adidasVideo, 0);
    expect(normalized).toMatchObject({
      platform: "youtube",
      post_id: "mJJY53qhJe0",
      content: adidasVideo.title,
      views: 7921025,
      likes: 285000,
      comments: 7300,
      media_urls: [adidasVideo.thumbnail],
    });
    expect(normalized?.posted_at).toBeTruthy();
    expect(normalized?.raw_data).toMatchObject({ product_type: "video" });
  });

  it("normalizes Shorts rows with product_type short", () => {
    const normalized = normalizeOrganicItem("youtube", adidasShort, 0);
    expect(normalized).toMatchObject({
      post_id: "iFlEvRC0S_o",
      views: 1100,
      media_urls: [adidasShort.thumbnail],
    });
    expect(normalized?.raw_data).toMatchObject({ product_type: "short" });
  });
});

describe("organicPostDisplayFields scrapesmith youtube", () => {
  it("extracts author, url, and landscape aspect for videos", () => {
    expect(organicPostDisplayFields(adidasVideo, "youtube")).toMatchObject({
      post_url: adidasVideo.video_url,
      author_display_name: "adidas",
      author_username: adidasVideo.channel_url,
      product_type: null,
      media_aspect: "landscape",
    });
  });

  it("uses vertical aspect for Shorts", () => {
    const raw = { ...adidasShort, product_type: "short" };
    expect(organicPostDisplayFields(raw, "youtube")).toMatchObject({
      post_url: adidasShort.video_url,
      product_type: "short",
      media_aspect: "vertical",
    });
  });
});
