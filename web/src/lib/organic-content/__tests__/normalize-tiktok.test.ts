import { describe, expect, it } from "vitest";

import { normalizeOrganicItem } from "../normalize";
import { organicPostDisplayFields } from "../post-display";

const clockworksTikTokPost = {
  id: "7398101551744552225",
  text: "Download Cal AI today! The future of calorie tracking",
  createTime: 1722507152,
  createTimeISO: "2024-08-01T09:32:32.000Z",
  webVideoUrl: "https://www.tiktok.com/@calai.app/video/7398101551744552225",
  diggCount: 5344,
  shareCount: 701,
  playCount: 145900,
  commentCount: 24,
  mediaUrls: [],
  authorMeta: {
    name: "calai.app",
    nickName: "Cal AI",
    avatar: "https://tiktok.example/avatar.jpg",
  },
  videoMeta: {
    height: 1024,
    width: 576,
    duration: 15,
    coverUrl: "https://tiktok.example/cover.jpg",
    originalCoverUrl: "https://tiktok.example/original-cover.jpg",
  },
};

describe("normalizeTikTokPost", () => {
  it("maps coverUrl from nested videoMeta when mediaUrls is empty", () => {
    const normalized = normalizeOrganicItem("tiktok", clockworksTikTokPost, 0);
    expect(normalized).not.toBeNull();
    expect(normalized?.post_id).toBe("7398101551744552225");
    expect(normalized?.content).toBe("Download Cal AI today! The future of calorie tracking");
    expect(normalized?.posted_at).toBe("2024-08-01T09:32:32.000Z");
    expect(normalized?.likes).toBe(5344);
    expect(normalized?.comments).toBe(24);
    expect(normalized?.shares).toBe(701);
    expect(normalized?.views).toBe(145900);
    expect(normalized?.media_urls[0]).toBe("https://tiktok.example/cover.jpg");
    expect(normalized?.media_urls).toContain("https://tiktok.example/original-cover.jpg");
  });

  it("supports flattened videoMeta.coverUrl keys from Apify exports", () => {
    const flattened = {
      text: "Flattened export",
      diggCount: 10,
      webVideoUrl: "https://www.tiktok.com/@user/video/1234567890",
      "videoMeta.coverUrl": "https://tiktok.example/flat-cover.jpg",
    };
    const normalized = normalizeOrganicItem("tiktok", flattened, 0);
    expect(normalized?.media_urls[0]).toBe("https://tiktok.example/flat-cover.jpg");
    expect(normalized?.post_id).toBe("1234567890");
  });
});

describe("organicPostDisplayFields tiktok", () => {
  it("extracts author and post_url from clockworks raw_data", () => {
    expect(organicPostDisplayFields(clockworksTikTokPost, "tiktok")).toMatchObject({
      post_url: "https://www.tiktok.com/@calai.app/video/7398101551744552225",
      author_username: "calai.app",
      author_display_name: "Cal AI",
      author_avatar_url: "https://tiktok.example/avatar.jpg",
      media_aspect: "vertical",
    });
  });
});
