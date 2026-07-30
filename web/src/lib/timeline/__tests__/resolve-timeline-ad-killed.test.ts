import { describe, expect, it } from "vitest";

import { resolveTimelineAdKilled, resolveTimelineAdRunning } from "@/lib/timeline/resolve-timeline-ad-killed";

const NOW = Date.parse("2026-07-05T12:00:00.000Z");

describe("resolveTimelineAdKilled", () => {
  it("marks sweep-reconciled inactive rows as killed", () => {
    expect(
      resolveTimelineAdKilled(
        {
          platform: "meta",
          last_seen_at: "2026-07-05T10:00:00.000Z",
          is_active: false,
          raw_payload: { isActive: true },
        },
        "2026-07-05T11:00:00.000Z",
        NOW,
      ),
    ).toBe(true);
  });

  it("keeps meta ads running until the next scrape when last_seen matches last scrape", () => {
    expect(
      resolveTimelineAdKilled(
        {
          platform: "meta",
          last_seen_at: "2026-07-02T10:00:00.000Z",
          is_active: true,
          raw_payload: { isActive: true },
        },
        "2026-07-02T10:00:00.000Z",
        Date.parse("2026-07-05T12:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("marks meta ads killed when last_seen is stale relative to last scrape anchor", () => {
    expect(
      resolveTimelineAdKilled(
        {
          platform: "meta",
          last_seen_at: "2026-07-04T08:00:00.000Z",
          is_active: true,
          raw_payload: { isActive: true },
        },
        "2026-07-05T11:00:00.000Z",
        NOW,
      ),
    ).toBe(true);
  });

  it("marks meta ads ended in payload as killed", () => {
    expect(
      resolveTimelineAdKilled(
        {
          platform: "meta",
          last_seen_at: "2026-07-05T10:00:00.000Z",
          is_active: true,
          raw_payload: {
            isActive: false,
            endedAt: Math.floor(Date.parse("2026-06-01T00:00:00.000Z") / 1000),
          },
        },
        "2026-07-05T11:00:00.000Z",
        NOW,
      ),
    ).toBe(true);
  });

  it("keeps google ads running between scrapes when is_active is true", () => {
    expect(
      resolveTimelineAdRunning(
        {
          platform: "google",
          last_seen_at: "2026-07-02T10:00:00.000Z",
          is_active: true,
          raw_payload: { type: "google", lastShown: "2026-07-01" },
        },
        "2026-07-02T10:00:00.000Z",
        Date.parse("2026-07-05T12:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("keeps non-sweep ads running only when seen near last scrape", () => {
    expect(
      resolveTimelineAdRunning(
        {
          platform: "linkedin",
          last_seen_at: "2026-07-05T10:00:00.000Z",
          is_active: null,
          raw_payload: {},
        },
        "2026-07-05T11:00:00.000Z",
        NOW,
      ),
    ).toBe(true);

    expect(
      resolveTimelineAdRunning(
        {
          platform: "linkedin",
          last_seen_at: "2026-05-15T10:00:00.000Z",
          is_active: null,
          raw_payload: {},
        },
        "2026-05-21T10:00:00.000Z",
        NOW,
      ),
    ).toBe(false);
  });
});
