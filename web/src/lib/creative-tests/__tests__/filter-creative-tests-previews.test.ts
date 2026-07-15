import { describe, expect, it } from "vitest";

import {
  creativeTestAdHasExpiredPreview,
  filterCreativeTestsWithExpiredPreviews,
} from "@/lib/creative-tests/filter-creative-tests-previews";

describe("creativeTestAdHasExpiredPreview", () => {
  it("is false when archived copy exists", () => {
    expect(
      creativeTestAdHasExpiredPreview({
        id: "1",
        platform: "meta",
        ad_creative_url: null,
        archived_creative_url: "https://storage.example.com/a.jpg",
        last_seen_at: "2020-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("is true for live-only CDN links (unreliable for demo)", () => {
    expect(
      creativeTestAdHasExpiredPreview({
        id: "1",
        platform: "meta",
        ad_creative_url: "https://cdn.example.com/live.jpg",
        archived_creative_url: null,
        last_seen_at: new Date().toISOString(),
      }),
    ).toBe(true);
  });

  it("is false when raw_payload contains a preview image", () => {
    expect(
      creativeTestAdHasExpiredPreview({
        id: "1",
        platform: "meta",
        ad_creative_url: null,
        archived_creative_url: null,
        raw_payload: {
          id: "123",
          img: "",
          isVideo: false,
          snapshot: { cards: [{ original_image_url: "https://scontent.xx.fbcdn.net/v/x.jpg" }] },
        },
        last_seen_at: new Date().toISOString(),
      }),
    ).toBe(false);
  });

  it("is true for stale live-only CDN links", () => {
    expect(
      creativeTestAdHasExpiredPreview({
        id: "1",
        platform: "google",
        ad_creative_url: "https://cdn.example.com/expired.jpg",
        archived_creative_url: null,
        last_seen_at: "2020-01-01T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("is true when there is no preview URL at all", () => {
    expect(
      creativeTestAdHasExpiredPreview({
        id: "1",
        platform: "meta",
        ad_creative_url: null,
        archived_creative_url: null,
        last_seen_at: new Date().toISOString(),
      }),
    ).toBe(true);
  });
});

describe("filterCreativeTestsWithExpiredPreviews", () => {
  it("removes the entire test when any ad has an expired preview", () => {
    const out = filterCreativeTestsWithExpiredPreviews([
      {
        id: "t1",
        ad_ids: ["a", "b"],
        ad_count: 2,
        winner_ad_id: "a",
        ads: [
          {
            id: "a",
            platform: "google",
            ad_creative_url: "https://cdn.example.com/a.jpg",
            archived_creative_url: null,
            last_seen_at: "2020-01-01T00:00:00.000Z",
          },
          {
            id: "b",
            platform: "google",
            ad_creative_url: "https://cdn.example.com/b.jpg",
            archived_creative_url: null,
            last_seen_at: "2020-01-02T00:00:00.000Z",
          },
        ],
      },
      {
        id: "t2",
        ad_ids: ["c", "d"],
        ad_count: 2,
        winner_ad_id: "c",
        ads: [
          {
            id: "c",
            platform: "google",
            ad_creative_url: "https://cdn.example.com/c.jpg",
            archived_creative_url: "https://storage.example.com/c.jpg",
            last_seen_at: "2020-01-01T00:00:00.000Z",
          },
          {
            id: "d",
            platform: "google",
            ad_creative_url: "https://cdn.example.com/d.jpg",
            archived_creative_url: "https://storage.example.com/d.jpg",
            last_seen_at: "2020-01-02T00:00:00.000Z",
          },
        ],
      },
    ]);

    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("t2");
  });
});
