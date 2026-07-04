import { describe, expect, it } from "vitest";

import { buildCanonicalDetailSlices } from "@/lib/ad-detail/detail-canonical-fields";
import {
  parseTikTokLocationImpressionsFromRecord,
  tiktokImpressionsCollapsedHeadline,
} from "@/lib/ad-detail/tiktok-region-stats";

const LEXIS_PAYLOAD: Record<string, unknown> = {
  id: "1868064758433793",
  impressions: "100K-200K",
  adImpressions: "100K-200K",
  adEstimatedAudience: "1.3M-1.6M",
  targetAudienceSize: "1.3M-1.6M",
  uniqueUsersSeen: "100K-200K",
  flightStartMs: 1782000000000,
  targetRegion: "Switzerland (CH)",
  targetingByLocation: [{ region: "CH", impressions: "99K", breakdowns: [] }],
};

describe("buildCanonicalDetailSlices — tiktok impressions", () => {
  it("does not merge estimated audience into impressions", () => {
    const slices = buildCanonicalDetailSlices("tiktok", LEXIS_PAYLOAD, null);
    expect(slices.impressionsFormatted).toBe("100K-200K");
    expect(slices.impressionsFormatted).not.toContain("1.3M");
    expect(slices.impressionsFormatted).not.toContain("·");
  });
});

describe("parseTikTokLocationImpressionsFromRecord", () => {
  it("maps targetingByLocation to territory disclosure rows", () => {
    const rows = parseTikTokLocationImpressionsFromRecord(LEXIS_PAYLOAD);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.territory).toContain("Switzerland");
    expect(rows[0]!.valueLabel).toBe("99K");
  });
});

describe("tiktokImpressionsCollapsedHeadline", () => {
  it("prefers total impressions band over single-country row", () => {
    const rows = parseTikTokLocationImpressionsFromRecord(LEXIS_PAYLOAD);
    expect(tiktokImpressionsCollapsedHeadline("100K-200K", rows)).toBe("100K-200K");
  });
});
