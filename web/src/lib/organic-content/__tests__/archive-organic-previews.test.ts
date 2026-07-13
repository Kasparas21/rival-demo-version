import { describe, expect, it } from "vitest";

import {
  organicPostNeedsArchiving,
  pickOrganicArchivablePreviewUrl,
  pickOrganicArchivableRasterUrls,
} from "@/lib/organic-content/archive-organic-previews";

describe("pickOrganicArchivablePreviewUrl", () => {
  it("prefers stored media_urls over raw_data", () => {
    const url = pickOrganicArchivablePreviewUrl({
      id: "x",
      platform: "tiktok",
      media_urls: ["https://cdn.example/cover.jpg"],
      raw_data: { videoMeta: { coverUrl: "https://cdn.example/other.jpg" } },
    });
    expect(url).toBe("https://cdn.example/cover.jpg");
  });

  it("skips video urls", () => {
    const url = pickOrganicArchivablePreviewUrl({
      id: "x",
      platform: "tiktok",
      media_urls: ["https://cdn.example/video.mp4"],
      raw_data: { videoMeta: { coverUrl: "https://cdn.example/cover.jpg" } },
    });
    expect(url).toBe("https://cdn.example/cover.jpg");
  });

  it("falls back to instagram image_url in raw_data", () => {
    const urls = pickOrganicArchivableRasterUrls({
      id: "x",
      platform: "instagram",
      media_urls: [],
      raw_data: {
        code: "DGecL_zS9uv",
        taken_at: 1740443195,
        image_url: "https://instagram.example/calai-feed.jpg",
      },
    });
    expect(urls).toEqual(["https://instagram.example/calai-feed.jpg"]);
  });

  it("falls back to twitter media_url_https in raw_data", () => {
    const urls = pickOrganicArchivableRasterUrls({
      id: "x",
      platform: "twitter",
      media_urls: [],
      raw_data: {
        extended_entities: {
          media: [{ media_url_https: "https://pbs.twimg.com/media/HMHTVqIXcAA8ItU.jpg" }],
        },
      },
    });
    expect(urls).toEqual(["https://pbs.twimg.com/media/HMHTVqIXcAA8ItU.jpg"]);
  });

  it("falls back to youtube thumbnails in raw_data", () => {
    const urls = pickOrganicArchivableRasterUrls({
      id: "x",
      platform: "youtube",
      media_urls: [],
      raw_data: {
        id: "mHdmGHk-ZJ0",
        thumbnails: [{ url: "https://i.ytimg.com/vi/mHdmGHk-ZJ0/hqdefault.jpg" }],
      },
    });
    expect(urls[0]).toContain("ytimg.com");
  });

  it("re-archives when media_urls still point at external CDN", () => {
    expect(
      organicPostNeedsArchiving({
        id: "x",
        platform: "tiktok",
        media_urls: ["https://tiktok.example/cover.jpg"],
        archived_preview_url: "https://project.supabase.co/storage/v1/object/public/organic-media/u/c/tiktok/x-old.jpg",
        raw_data: {},
      }),
    ).toBe(true);
  });

  it("skips fully archived posts", () => {
    const persisted = "https://project.supabase.co/storage/v1/object/public/organic-media/u/c/tiktok/x.jpg";
    expect(
      organicPostNeedsArchiving({
        id: "x",
        platform: "tiktok",
        media_urls: [persisted],
        archived_preview_url: persisted,
        raw_data: {},
      }),
    ).toBe(false);
  });
});
