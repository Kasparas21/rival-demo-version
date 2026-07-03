import { describe, expect, it } from "vitest";

import {
  computeOrganicMetricsOverview,
  metricsOverviewIsEmpty,
  normalizeMetricsOverview,
} from "@/lib/organic-content/compute-metrics";

describe("computeOrganicMetricsOverview", () => {
  it("returns zeros for empty posts", () => {
    expect(computeOrganicMetricsOverview([])).toEqual({
      avg_likes: 0,
      avg_comments: 0,
      avg_shares: 0,
      post_frequency_per_week: 0,
      best_platform: "",
      best_post_type: "",
    });
  });

  it("computes averages and best platform", () => {
    const metrics = computeOrganicMetricsOverview([
      {
        platform: "instagram",
        likes: 100,
        comments: 10,
        shares: 5,
        posted_at: "2026-06-01T00:00:00.000Z",
        product_type: "photo",
      },
      {
        platform: "youtube",
        likes: 300,
        comments: 20,
        shares: 0,
        posted_at: "2026-06-08T00:00:00.000Z",
        product_type: "video",
      },
    ]);

    expect(metrics.avg_likes).toBe(200);
    expect(metrics.avg_comments).toBe(15);
    expect(metrics.best_platform).toBe("youtube");
  });

  it("rounds averages to whole numbers", () => {
    const metrics = computeOrganicMetricsOverview([
      {
        platform: "instagram",
        likes: 100,
        comments: 10,
        shares: 0,
        posted_at: "2026-06-01T00:00:00.000Z",
      },
      {
        platform: "instagram",
        likes: 101,
        comments: 11,
        shares: 0,
        posted_at: "2026-06-08T00:00:00.000Z",
      },
      {
        platform: "instagram",
        likes: 102,
        comments: 12,
        shares: 0,
        posted_at: "2026-06-15T00:00:00.000Z",
      },
    ]);

    expect(metrics.avg_comments).toBe(11);
    expect(Number.isInteger(metrics.avg_likes)).toBe(true);
  });
});

describe("normalizeMetricsOverview", () => {
  it("rounds messy stored values", () => {
    expect(
      normalizeMetricsOverview({
        avg_comments: 59.03333333333333,
        avg_likes: 86400.7,
        post_frequency_per_week: 5.2,
      }),
    ).toEqual({
      avg_likes: 86401,
      avg_comments: 59,
      avg_shares: 0,
      post_frequency_per_week: 5,
      best_platform: "",
      best_post_type: "",
    });
  });
});

describe("metricsOverviewIsEmpty", () => {
  it("detects empty stored metrics", () => {
    expect(metricsOverviewIsEmpty({ avg_likes: 0, avg_comments: 0, post_frequency_per_week: 0 })).toBe(
      true,
    );
    expect(metricsOverviewIsEmpty({ avg_likes: 10, avg_comments: 0, post_frequency_per_week: 0 })).toBe(
      false,
    );
  });
});
