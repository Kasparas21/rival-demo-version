import { describe, expect, it } from "vitest";

import { metaCardForLifecycle } from "@/lib/ad-library/meta-payload-lifecycle";
import { resolveMetaAdKilledForDetail } from "@/lib/ad-detail/resolve-meta-ad-killed";

const LAST_SCRAPED = "2026-07-03T10:00:00.000Z";
const RECENT_SEEN = "2026-07-03T09:00:00.000Z";

describe("metaCardForLifecycle", () => {
  it("recovers end_date dropped by older normalizers", () => {
    const endedSec = Math.floor(new Date("2024-06-02T00:00:00.000Z").getTime() / 1000);
    const card = metaCardForLifecycle(
      {
        id: "26493469133670382",
        isActive: true,
        end_date: endedSec,
        startedAt: endedSec - 86400 * 34,
      },
      Date.parse(LAST_SCRAPED)
    );
    expect(card?.isActive).toBe(false);
    expect(card?.endedAt).toBe(endedSec);
  });
});

describe("resolveMetaAdKilledForDetail with recovered end_date", () => {
  it("marks inactive even when last_seen is from today's scrape", () => {
    const endedSec = Math.floor(new Date("2024-06-02T00:00:00.000Z").getTime() / 1000);
    expect(
      resolveMetaAdKilledForDetail(
        {
          isActive: true,
          end_date: endedSec,
          startedAt: endedSec - 86400 * 34,
        },
        RECENT_SEEN,
        LAST_SCRAPED
      )
    ).toBe(true);
  });
});
