import { describe, expect, it } from "vitest";

import { normalizeOrganicItem } from "../normalize";
import { organicPostDisplayFields } from "../post-display";

const adidasVideo = {
  inputSource: "@adidas",
  type: "video",
  id: "mHdmGHk-ZJ0",
  title: "Just Start (Why creating Habits will Change Everything)",
  status: "OK",
  url: "https://www.youtube.com/watch?v=mHdmGHk-ZJ0",
  duration: 1538,
  views: 5699,
  likes: 135,
  comments: 15,
  channel: {
    id: "UCuLUOxd7ezJ8c6NSLBNRRfg",
    name: "adidas",
    handle: "@adidas",
    url: "https://www.youtube.com/channel/UCuLUOxd7ezJ8c6NSLBNRRfg",
  },
  thumbnails: [
    { url: "https://i.ytimg.com/vi/mHdmGHk-ZJ0/hqdefault.jpg", width: 480, height: 360 },
    { url: "https://i.ytimg.com/vi/mHdmGHk-ZJ0/maxresdefault.jpg", width: 1280, height: 720 },
  ],
};

describe("normalizeApidojoYouTubePost", () => {
  it("normalizes long-form channel video rows", () => {
    const normalized = normalizeOrganicItem("youtube", adidasVideo, 0);
    expect(normalized).toMatchObject({
      platform: "youtube",
      post_id: "mHdmGHk-ZJ0",
      content: adidasVideo.title,
      views: 5699,
      likes: 135,
      comments: 15,
      media_urls: ["https://i.ytimg.com/vi/mHdmGHk-ZJ0/maxresdefault.jpg"],
    });
    expect(normalized?.raw_data).toMatchObject({
      product_type: "video",
      video_url: adidasVideo.url,
      channel_id: "UCuLUOxd7ezJ8c6NSLBNRRfg",
      channel_name: "adidas",
    });
  });

  it("skips apidojo Short rows", () => {
    const normalized = normalizeOrganicItem(
      "youtube",
      {
        ...adidasVideo,
        type: "short",
        url: "https://www.youtube.com/shorts/abc123",
        id: "abc123",
      },
      0,
    );
    expect(normalized).toBeNull();
  });
});

describe("organicPostDisplayFields apidojo youtube", () => {
  it("extracts channel author and landscape aspect", () => {
    const raw = { ...adidasVideo, product_type: "video" };
    expect(organicPostDisplayFields(raw, "youtube")).toMatchObject({
      post_url: adidasVideo.url,
      author_display_name: "adidas",
      author_username: "@adidas",
      product_type: "video",
      media_aspect: "landscape",
    });
  });
});
