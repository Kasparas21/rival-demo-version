import { describe, expect, it } from "vitest";

import { LIVE_AD_RECENCY_DAYS } from "@/lib/spend-estimator/constants";
import { extractStableCreativeKey, liveCreativeGroupsPerPlatform } from "@/lib/spend-estimator/live-creatives";
import type { RowWithCreativePayload } from "@/lib/spend-estimator/live-creatives";

function row(p: Partial<RowWithCreativePayload> & Pick<RowWithCreativePayload, "id">): RowWithCreativePayload {
  const now = new Date().toISOString();
  return {
    platform: "meta",
    first_seen_at: now,
    last_seen_at: now,
    is_active: true,
    raw_payload: {},
    ...p,
  };
}

describe("liveCreativeGroupsPerPlatform", () => {
  it("dedupes duplicate DB rows sharing Meta archive id", () => {
    const now = new Date().toISOString();
    const rows = [
      row({ id: "uuid-1", raw_payload: { id: "arch-1" }, last_seen_at: now }),
      row({ id: "uuid-2", raw_payload: { id: "arch-1" }, last_seen_at: now }),
      row({ id: "uuid-3", raw_payload: { id: "arch-2" }, last_seen_at: now }),
    ];
    const m = liveCreativeGroupsPerPlatform(rows, Date.now(), LIVE_AD_RECENCY_DAYS);
    expect(m.get("meta")?.length).toBe(2);
  });

  it("without raw id, falls back to row id so row count equals distinct keys (old behavior)", () => {
    const now = new Date().toISOString();
    const rows = [
      row({ id: "a", raw_payload: {}, last_seen_at: now }),
      row({ id: "b", raw_payload: {}, last_seen_at: now }),
    ];
    const m = liveCreativeGroupsPerPlatform(rows, Date.now(), LIVE_AD_RECENCY_DAYS);
    expect(m.get("meta")?.length).toBe(2);
  });
});

describe("extractStableCreativeKey", () => {
  it("reads ad_archive_id variant", () => {
    const k = extractStableCreativeKey("meta", { ad_archive_id: "x9" }, "row");
    expect(k).toBe("meta:x9");
  });
});
