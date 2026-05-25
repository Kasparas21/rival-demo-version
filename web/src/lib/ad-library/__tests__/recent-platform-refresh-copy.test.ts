import { describe, expect, it } from "vitest";

import {
  buildRecentPlatformRefreshMessage,
  formatPlatformList,
  isRecentlyScrapedAt,
} from "@/lib/ad-library/recent-platform-refresh-copy";

describe("recent-platform-refresh-copy", () => {
  it("isRecentlyScrapedAt accepts scrapes within 24h", () => {
    const now = Date.parse("2026-05-24T12:00:00.000Z");
    expect(isRecentlyScrapedAt("2026-05-24T06:00:00.000Z", now)).toBe(true);
    expect(isRecentlyScrapedAt("2026-05-23T13:00:00.000Z", now)).toBe(true);
    expect(isRecentlyScrapedAt("2026-05-22T11:00:00.000Z", now)).toBe(false);
  });

  it("formatPlatformList joins names naturally", () => {
    expect(formatPlatformList(["Meta"])).toBe("Meta");
    expect(formatPlatformList(["Meta", "Google"])).toBe("Meta and Google");
    expect(formatPlatformList(["Meta", "Google", "TikTok"])).toBe("Meta, Google, and TikTok");
  });

  it("buildRecentPlatformRefreshMessage includes competitor name when provided", () => {
    expect(
      buildRecentPlatformRefreshMessage({
        platforms: ["meta", "google"],
        competitorName: "PUMA",
      }),
    ).toBe("Meta and Google have just refreshed for PUMA — you're up to date.");
  });

  it("buildRecentPlatformRefreshMessage works without competitor name", () => {
    expect(
      buildRecentPlatformRefreshMessage({
        platforms: ["meta"],
      }),
    ).toBe("Meta has just refreshed — you're up to date.");
  });
});
