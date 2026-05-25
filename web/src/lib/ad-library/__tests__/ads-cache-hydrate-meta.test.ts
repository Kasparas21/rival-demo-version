import { describe, expect, it } from "vitest";

import {
  isAdsCacheHydrateClientMetaFresh,
  pickBestAdsCacheMetadataByPlatform,
  type AdsCacheMetadataRow,
} from "@/lib/ad-library/ads-cache-hydrate-meta";

describe("isAdsCacheHydrateClientMetaFresh", () => {
  const nowIso = "2026-05-21T12:00:00.000Z";

  it("returns true when client ids and scraped_at still match picked server rows", () => {
    const rows: AdsCacheMetadataRow[] = [
      {
        id: "meta-id",
        platform: "meta",
        scraped_at: "2026-05-20T10:00:00.000Z",
        competitor_domain: "nike.com",
        expires_at: "2026-05-28T10:00:00.000Z",
      },
      {
        id: "google-id",
        platform: "google",
        scraped_at: "2026-05-19T08:00:00.000Z",
        competitor_domain: "nike.com",
        expires_at: "2026-05-27T08:00:00.000Z",
      },
    ];

    const fresh = isAdsCacheHydrateClientMetaFresh(
      {
        platforms: [
          { platform: "meta", id: "meta-id", scraped_at: "2026-05-20T10:00:00.000Z" },
          { platform: "google", id: "google-id", scraped_at: "2026-05-19T08:00:00.000Z" },
        ],
      },
      rows,
      "nike.com",
      nowIso,
    );

    expect(fresh).toBe(true);
  });

  it("returns false when scraped_at changed on a tracked row", () => {
    const rows: AdsCacheMetadataRow[] = [
      {
        id: "meta-id",
        platform: "meta",
        scraped_at: "2026-05-21T11:00:00.000Z",
        competitor_domain: "nike.com",
        expires_at: "2026-05-28T10:00:00.000Z",
      },
    ];

    const fresh = isAdsCacheHydrateClientMetaFresh(
      {
        platforms: [{ platform: "meta", id: "meta-id", scraped_at: "2026-05-20T10:00:00.000Z" }],
      },
      rows,
      "nike.com",
      nowIso,
    );

    expect(fresh).toBe(false);
  });

  it("returns false when server has an additional platform row", () => {
    const rows: AdsCacheMetadataRow[] = [
      {
        id: "meta-id",
        platform: "meta",
        scraped_at: "2026-05-20T10:00:00.000Z",
        competitor_domain: "nike.com",
        expires_at: "2026-05-28T10:00:00.000Z",
      },
      {
        id: "google-id",
        platform: "google",
        scraped_at: "2026-05-19T08:00:00.000Z",
        competitor_domain: "nike.com",
        expires_at: "2026-05-27T08:00:00.000Z",
      },
    ];

    const fresh = isAdsCacheHydrateClientMetaFresh(
      {
        platforms: [{ platform: "meta", id: "meta-id", scraped_at: "2026-05-20T10:00:00.000Z" }],
      },
      rows,
      "nike.com",
      nowIso,
    );

    expect(fresh).toBe(false);
  });
});

describe("pickBestAdsCacheMetadataByPlatform", () => {
  it("prefers canonical domain and newest scraped_at", () => {
    const picked = pickBestAdsCacheMetadataByPlatform(
      [
        {
          id: "older",
          platform: "meta",
          scraped_at: "2026-05-19T08:00:00.000Z",
          competitor_domain: "nike",
          expires_at: "2026-05-27T08:00:00.000Z",
        },
        {
          id: "newer",
          platform: "meta",
          scraped_at: "2026-05-20T10:00:00.000Z",
          competitor_domain: "nike.com",
          expires_at: "2026-05-28T10:00:00.000Z",
        },
      ],
      "nike.com",
      "2026-05-21T12:00:00.000Z",
    );

    expect(picked.get("meta")?.id).toBe("newer");
  });
});
