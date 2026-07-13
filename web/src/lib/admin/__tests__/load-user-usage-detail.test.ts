import { describe, expect, it } from "vitest";

import {
  aggregateAdsByCompetitorPlatform,
  aggregateOrganicPostCounts,
  aggregateSnapshotStats,
  buildCompetitorLandingPages,
} from "../load-user-usage-detail";

describe("aggregateAdsByCompetitorPlatform", () => {
  it("groups active ads by competitor and platform", () => {
    const result = aggregateAdsByCompetitorPlatform([
      { competitor_id: "c1", platform: "meta" },
      { competitor_id: "c1", platform: "meta" },
      { competitor_id: "c1", platform: "google" },
      { competitor_id: "c2", platform: "tiktok" },
    ]);

    expect(result.get("c1")).toEqual({ meta: 2, google: 1 });
    expect(result.get("c2")).toEqual({ tiktok: 1 });
  });
});

describe("aggregateOrganicPostCounts", () => {
  it("counts organic posts per competitor", () => {
    const result = aggregateOrganicPostCounts([
      { competitor_id: "c1" },
      { competitor_id: "c1" },
      { competitor_id: "c2" },
    ]);

    expect(result.get("c1")).toBe(2);
    expect(result.get("c2")).toBe(1);
  });
});

describe("aggregateSnapshotStats", () => {
  it("tracks count and latest screenshot per landing page", () => {
    const result = aggregateSnapshotStats([
      {
        landing_page_id: "lp1",
        screenshot_url: "https://example.com/old.jpg",
        taken_at: "2026-07-01T00:00:00.000Z",
      },
      {
        landing_page_id: "lp1",
        screenshot_url: "https://example.com/new.jpg",
        taken_at: "2026-07-10T00:00:00.000Z",
      },
      {
        landing_page_id: "lp2",
        screenshot_url: "https://example.com/other.jpg",
        taken_at: "2026-07-05T00:00:00.000Z",
      },
    ]);

    expect(result.get("lp1")).toEqual({
      count: 2,
      latestUrl: "https://example.com/new.jpg",
      latestTakenAt: "2026-07-10T00:00:00.000Z",
    });
    expect(result.get("lp2")?.count).toBe(1);
  });
});

describe("buildCompetitorLandingPages", () => {
  it("merges landing page rows with snapshot aggregates", () => {
    const snapshotAgg = aggregateSnapshotStats([
      {
        landing_page_id: "lp1",
        screenshot_url: "https://example.com/latest.jpg",
        taken_at: "2026-07-10T00:00:00.000Z",
      },
    ]);

    const pages = buildCompetitorLandingPages(
      [
        {
          id: "lp1",
          url: "https://rival.com/pricing",
          label: "Pricing",
          is_active: false,
          auto_detected_from: "ads",
          last_screenshotted_at: "2026-07-10T00:00:00.000Z",
        },
      ],
      snapshotAgg,
    );

    expect(pages).toEqual([
      {
        id: "lp1",
        url: "https://rival.com/pricing",
        label: "Pricing",
        is_active: false,
        auto_detected_from: "ads",
        snapshotCount: 1,
        last_screenshotted_at: "2026-07-10T00:00:00.000Z",
        latestScreenshotUrl: "https://example.com/latest.jpg",
      },
    ]);
  });
});
