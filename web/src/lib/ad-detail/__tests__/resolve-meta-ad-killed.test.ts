import { describe, expect, it } from "vitest";

import { resolveMetaAdKilledForDetail } from "@/lib/ad-detail/resolve-meta-ad-killed";

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
