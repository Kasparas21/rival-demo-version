import { describe, expect, it } from "vitest";

import { resolveMetaAdKilledForDetail, isMetaRunningForLibraryRow } from "@/lib/ad-detail/resolve-meta-ad-killed";

const LAST_SCRAPED = "2026-07-03T10:00:00.000Z";
const RECENT_SEEN = "2026-07-03T09:00:00.000Z";
const OLD_SEEN = "2026-06-01T09:00:00.000Z";

describe("resolveMetaAdKilledForDetail", () => {
  it("marks inactive when Meta payload has endedAt before scrape day", () => {
    const endedSec = Math.floor(new Date("2024-06-02T00:00:00.000Z").getTime() / 1000);
    expect(
      resolveMetaAdKilledForDetail(
        { isActive: false, endedAt: endedSec, startedAt: endedSec - 86400 * 34 },
        RECENT_SEEN,
        LAST_SCRAPED
      )
    ).toBe(true);
  });

  it("marks killed when missing from latest scrape even if payload lacks end date", () => {
    expect(resolveMetaAdKilledForDetail({ startedAt: 1_700_000_000 }, OLD_SEEN, LAST_SCRAPED)).toBe(true);
  });

  it("stays running when seen recently and payload is active", () => {
    expect(
      resolveMetaAdKilledForDetail({ isActive: true, startedAt: 1_700_000_000 }, RECENT_SEEN, LAST_SCRAPED)
    ).toBe(false);
  });
});

describe("isMetaRunningForLibraryRow", () => {
  it("marks not running when DB is_active is false", () => {
    expect(
      isMetaRunningForLibraryRow({
        rawPayload: { isActive: true, startedAt: 1_700_000_000 },
        lastSeenAt: RECENT_SEEN,
        lastScrapedAt: LAST_SCRAPED,
        isActiveDb: false,
      })
    ).toBe(false);
  });

  it("marks not running when last_seen is stale vs last scrape", () => {
    expect(
      isMetaRunningForLibraryRow({
        rawPayload: { isActive: true, startedAt: 1_700_000_000 },
        lastSeenAt: OLD_SEEN,
        lastScrapedAt: LAST_SCRAPED,
        isActiveDb: true,
      })
    ).toBe(false);
  });

  it("marks running when seen on latest scrape and payload is active", () => {
    expect(
      isMetaRunningForLibraryRow({
        rawPayload: { isActive: true, startedAt: 1_700_000_000 },
        lastSeenAt: RECENT_SEEN,
        lastScrapedAt: LAST_SCRAPED,
        isActiveDb: true,
      })
    ).toBe(true);
  });
});

describe("detail drawer parity with library cards", () => {
  it("marks killed when payload ended before last scrape (Cal AI–style inactive ad)", () => {
    const endedSec = Math.floor(new Date("2025-08-01T00:00:00.000Z").getTime() / 1000);
    const killed = !isMetaRunningForLibraryRow({
      rawPayload: {
        isActive: true,
        end_date: endedSec,
        startedAt: endedSec - 86400 * 32,
      },
      lastSeenAt: "2025-08-01T12:00:00.000Z",
      lastScrapedAt: "2026-07-04T10:00:00.000Z",
      isActiveDb: true,
    });
    expect(killed).toBe(true);
  });
});
