import { describe, expect, it } from "vitest";

import { isScrapedAdKilled, isScrapedAdRunning } from "@/lib/ad-library/scraped-ad-lifecycle";

const NOW = Date.parse("2026-05-20T12:00:00.000Z");

describe("isScrapedAdKilled", () => {
  it("running when last_seen is within 24h of last scrape", () => {
    const lastScraped = "2026-05-20T10:00:00.000Z";
    const lastSeen = "2026-05-20T09:00:00.000Z";
    expect(isScrapedAdKilled(lastSeen, lastScraped, NOW)).toBe(false);
    expect(isScrapedAdRunning(lastSeen, lastScraped, NOW)).toBe(true);
  });

  it("killed when last_seen is older than 24h before last scrape", () => {
    const lastScraped = "2026-05-20T10:00:00.000Z";
    const lastSeen = "2026-05-15T10:00:00.000Z";
    expect(isScrapedAdKilled(lastSeen, lastScraped, NOW)).toBe(true);
  });
});
