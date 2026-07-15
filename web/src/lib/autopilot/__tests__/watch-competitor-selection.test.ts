import { describe, expect, it } from "vitest";

import {
  isWatchAllCompetitors,
  normalizeWatchCompetitorIdsFromSelection,
  resolveExplicitWatchedCompetitorIds,
} from "../watch-competitor-selection";

describe("watch-competitor-selection", () => {
  it("treats null as watch all", () => {
    expect(isWatchAllCompetitors(null)).toBe(true);
    expect(isWatchAllCompetitors([])).toBe(false);
    expect(resolveExplicitWatchedCompetitorIds(null, ["a", "b"])).toEqual(new Set(["a", "b"]));
  });

  it("treats empty array as watch none", () => {
    expect(resolveExplicitWatchedCompetitorIds([], ["a", "b"])).toEqual(new Set());
  });

  it("normalizes full selection back to null", () => {
    expect(
      normalizeWatchCompetitorIdsFromSelection(new Set(["a", "b"]), ["a", "b"]),
    ).toBeNull();
  });

  it("keeps partial and empty explicit selections", () => {
    expect(
      normalizeWatchCompetitorIdsFromSelection(new Set(["a"]), ["a", "b"]),
    ).toEqual(["a"]);
    expect(
      normalizeWatchCompetitorIdsFromSelection(new Set(), ["a", "b"]),
    ).toEqual([]);
  });
});
