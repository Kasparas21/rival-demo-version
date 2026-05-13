import { describe, expect, it } from "vitest";

import { computePlatformVelocitiesFromScrapedRows } from "@/lib/competitor/ad-library-velocity";

describe("computePlatformVelocitiesFromScrapedRows", () => {
  const now = new Date("2026-05-10T12:00:00.000Z").getTime();
  const scraped = new Date("2026-05-10T10:00:00.000Z").getTime();
  const killedThreshold = scraped - 24 * 60 * 60 * 1000;

  it("returns all 6 platforms with zeros when no rows", () => {
    const v = computePlatformVelocitiesFromScrapedRows([], scraped, now);
    expect(v).toHaveLength(6);
    expect(v.map((x) => x.platform)).toEqual([
      "meta",
      "google",
      "tiktok",
      "linkedin",
      "pinterest",
      "snapchat",
    ]);
    for (const row of v) {
      expect(row.total_count).toBe(0);
      expect(row.active_count).toBe(0);
      expect(row.latest_ad_first_seen_at).toBeNull();
      expect(row.days_since_latest).toBeNull();
    }
  });

  it("uses max first_seen among active ads per platform for velocity", () => {
    const rows = [
      {
        platform: "meta",
        first_seen_at: new Date("2026-05-01T00:00:00.000Z").toISOString(),
        last_seen_at: new Date("2026-05-09T15:00:00.000Z").toISOString(),
      },
      {
        platform: "meta",
        first_seen_at: new Date("2026-05-08T00:00:00.000Z").toISOString(),
        last_seen_at: new Date("2026-05-09T12:00:00.000Z").toISOString(),
      },
    ];
    const v = computePlatformVelocitiesFromScrapedRows(rows, scraped, now);
    const meta = v.find((r) => r.platform === "meta")!;
    expect(meta.active_count).toBe(2);
    expect(meta.total_count).toBe(2);
    expect(meta.latest_ad_first_seen_at).toBe(new Date("2026-05-08T00:00:00.000Z").toISOString());
    expect(meta.days_since_latest).toBe(2);
  });

  it("excludes killed ads from latest and active_count", () => {
    const rows = [
      {
        platform: "tiktok",
        first_seen_at: new Date("2026-05-09T00:00:00.000Z").toISOString(),
        last_seen_at: new Date("2026-05-01T00:00:00.000Z").toISOString(),
      },
      {
        platform: "tiktok",
        first_seen_at: new Date("2026-04-20T00:00:00.000Z").toISOString(),
        last_seen_at: new Date("2026-05-09T12:00:00.000Z").toISOString(),
      },
    ];
    const v = computePlatformVelocitiesFromScrapedRows(rows, scraped, now);
    const tt = v.find((r) => r.platform === "tiktok")!;
    expect(tt.total_count).toBe(2);
    expect(tt.active_count).toBe(1);
    expect(tt.latest_ad_first_seen_at).toBe(new Date("2026-04-20T00:00:00.000Z").toISOString());
  });

  it("days_since_latest is null when all ads on platform are killed", () => {
    const rows = [
      {
        platform: "google",
        first_seen_at: new Date("2026-05-05T00:00:00.000Z").toISOString(),
        last_seen_at: new Date(killedThreshold - 1000).toISOString(),
      },
    ];
    const v = computePlatformVelocitiesFromScrapedRows(rows, scraped, now);
    const g = v.find((r) => r.platform === "google")!;
    expect(g.active_count).toBe(0);
    expect(g.total_count).toBe(1);
    expect(g.latest_ad_first_seen_at).toBeNull();
    expect(g.days_since_latest).toBeNull();
  });

  it("ignores unknown platforms", () => {
    const rows = [
      {
        platform: "microsoft",
        first_seen_at: new Date("2026-05-09T00:00:00.000Z").toISOString(),
        last_seen_at: new Date("2026-05-09T12:00:00.000Z").toISOString(),
      },
    ];
    const v = computePlatformVelocitiesFromScrapedRows(rows, scraped, now);
    expect(v.find((r) => r.platform === "meta")!.total_count).toBe(0);
  });
});
