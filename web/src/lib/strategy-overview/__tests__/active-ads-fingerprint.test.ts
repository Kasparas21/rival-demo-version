import { describe, expect, it } from "vitest";

import {
  EMPTY_ACTIVE_ADS_FINGERPRINT,
  formatActiveAdsFingerprint,
} from "@/lib/strategy-overview/active-ads-fingerprint";

describe("formatActiveAdsFingerprint", () => {
  it("formats count and timestamps", () => {
    expect(
      formatActiveAdsFingerprint({
        activeCount: 608,
        maxLastSeenAt: "2026-05-24T17:00:00.000Z",
        maxCreatedAt: "2026-05-20T10:00:00.000Z",
      })
    ).toBe("608:2026-05-24T17:00:00.000Z:2026-05-20T10:00:00.000Z");
  });

  it("uses 0 placeholders when empty", () => {
    expect(EMPTY_ACTIVE_ADS_FINGERPRINT).toBe("0:0:0");
  });
});
