import { describe, expect, it } from "vitest";
import { parseGoogleShownSummaryRange } from "@/lib/ad-library/google-shown-range";

describe("parseGoogleShownSummaryRange", () => {
  it("parses Transparency copy with Shown prefix", () => {
    expect(parseGoogleShownSummaryRange("Shown 2025-11-25 -> 2026-05-16")).toEqual({
      first: "2025-11-25",
      last: "2026-05-16",
    });
  });

  it("parses bare ISO pair with en dash (card shownSummary shape)", () => {
    expect(parseGoogleShownSummaryRange("2024-05-01 – 2026-05-15")).toEqual({
      first: "2024-05-01",
      last: "2026-05-15",
    });
  });

  it("parses bare pair with ASCII hyphen", () => {
    expect(parseGoogleShownSummaryRange("2024-05-01 - 2026-05-15")).toEqual({
      first: "2024-05-01",
      last: "2026-05-15",
    });
  });

  it("parses first embedded pair when extra text surrounds", () => {
    expect(parseGoogleShownSummaryRange("Note: 2023-01-10 — 2024-12-01 trailing")).toEqual({
      first: "2023-01-10",
      last: "2024-12-01",
    });
  });
});
