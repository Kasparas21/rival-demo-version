import { describe, expect, it } from "vitest";

import { filterGoogleRowsActiveToday } from "@/lib/ad-library/google-active-today-filter";
import type { GoogleAdRow } from "@/lib/ad-library/normalize";

const nowMs = Date.parse("2026-05-19T12:00:00.000Z");

function googleRow(overrides: Partial<Extract<GoogleAdRow, { type: "google" }>> = {}): GoogleAdRow {
  return {
    type: "google",
    id: "g1",
    title: "t",
    url: "https://example.com",
    desc: "",
    img: null,
    adUrl: "https://adstransparency.google.com/",
    ...overrides,
  };
}

describe("filterGoogleRowsActiveToday", () => {
  it("keeps rows with lastShown today", () => {
    const rows = [
      googleRow({ id: "a", lastShown: "2026-05-19T08:00:00.000Z" }),
      googleRow({ id: "b", lastShown: "2026-05-01T08:00:00.000Z" }),
    ];
    const out = filterGoogleRowsActiveToday(rows, nowMs);
    expect(out.map((r) => r.id)).toEqual(["a"]);
  });

  it("returns all rows when filter would be empty", () => {
    const rows = [googleRow({ id: "old", lastShown: "2026-01-01T00:00:00.000Z" })];
    expect(filterGoogleRowsActiveToday(rows, nowMs)).toEqual(rows);
  });
});
