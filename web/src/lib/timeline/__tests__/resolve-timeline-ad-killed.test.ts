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

  it("marks meta ads killed when detail would (stale last_seen + null scrape anchor)", () => {
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
