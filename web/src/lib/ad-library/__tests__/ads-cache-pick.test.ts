import { describe, expect, it } from "vitest";

import { pickBestAdsCacheHitsByPlatform } from "@/lib/ad-library/ads-cache-pick";

describe("pickBestAdsCacheHitsByPlatform", () => {
  it("keeps older non-empty cache when a newer manual refresh stored zero ads", () => {
    const nowIso = "2026-05-21T12:00:00.000Z";
    const picked = pickBestAdsCacheHitsByPlatform(
      [
        {
          platform: "tiktok",
          competitor_domain: "nike.com",
          scraped_at: "2026-05-21T11:58:00.000Z",
          expires_at: "2026-05-28T11:58:00.000Z",
          ads_data: { ads: [], error: null },
        },
        {
          platform: "tiktok",
          competitor_domain: "nike.com",
          scraped_at: "2026-05-20T10:00:00.000Z",
          expires_at: "2026-05-27T10:00:00.000Z",
          ads_data: {
            ads: [{ id: "tt-1", headline: "Nike", desc: "d", url: "u", img: "https://x.test/a.jpg", advertiser: "Nike", adUrl: "https://library.tiktok.com/ads/detail/tt-1" }],
            error: null,
          },
        },
      ],
      "nike.com",
      nowIso,
    );

    const payload = picked.get("tiktok") as { ads?: unknown[] };
    expect(payload?.ads?.length).toBe(1);
  });

  it("keeps expired non-empty cache over a fresh empty snapshot", () => {
    const nowIso = "2026-05-21T12:00:00.000Z";
    const picked = pickBestAdsCacheHitsByPlatform(
      [
        {
          platform: "tiktok",
          competitor_domain: "nike.com",
          scraped_at: "2026-05-21T11:59:00.000Z",
          expires_at: "2026-05-28T11:59:00.000Z",
          ads_data: { ads: [], error: null },
        },
        {
          platform: "tiktok",
          competitor_domain: "nike.com",
          scraped_at: "2026-05-20T10:00:00.000Z",
          expires_at: "2026-05-20T11:00:00.000Z",
          ads_data: {
            ads: [{ id: "tt-1", headline: "Nike", desc: "d", url: "u", img: "https://x.test/a.jpg", advertiser: "Nike", adUrl: "https://library.tiktok.com/ads/detail/tt-1" }],
            error: null,
          },
        },
      ],
      "nike.com",
      nowIso,
    );

    const payload = picked.get("tiktok") as { ads?: unknown[] };
    expect(payload?.ads?.length).toBe(1);
  });
});
