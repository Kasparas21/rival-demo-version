import { describe, expect, it } from "vitest";

import {
  discoveryCompetitorSelectionLabel,
  isDiscoveryDefaultCompetitorSelection,
  resolveDiscoveryCompetitorIds,
  setDiscoveryAllCompetitors,
  toggleDiscoveryCompetitor,
} from "@/components/discovery/discovery-types";

const COMPETITORS = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
  { id: "c", name: "Gamma" },
];

describe("discovery competitor selection", () => {
  it("treats empty selection as all brands", () => {
    expect(resolveDiscoveryCompetitorIds(new Set(), COMPETITORS)).toBeNull();
    expect(discoveryCompetitorSelectionLabel(new Set(), COMPETITORS)).toBe("All brands");
    expect(isDiscoveryDefaultCompetitorSelection(new Set(), COMPETITORS)).toBe(true);
  });

  it("supports multi-select toggles", () => {
    const narrowed = toggleDiscoveryCompetitor(new Set(), COMPETITORS, "b", false);
    expect([...narrowed].sort()).toEqual(["a", "c"]);
    expect(discoveryCompetitorSelectionLabel(narrowed, COMPETITORS)).toBe("2 brands");

    const two = toggleDiscoveryCompetitor(narrowed, COMPETITORS, "c", false);
    expect([...two]).toEqual(["a"]);
    expect(discoveryCompetitorSelectionLabel(two, COMPETITORS)).toBe("Alpha");
  });

  it("returns to all when every brand is checked", () => {
    let selected = toggleDiscoveryCompetitor(new Set(), COMPETITORS, "a", true);
    selected = toggleDiscoveryCompetitor(selected, COMPETITORS, "b", true);
    selected = toggleDiscoveryCompetitor(selected, COMPETITORS, "c", true);
    expect(selected.size).toBe(0);
    expect(isDiscoveryDefaultCompetitorSelection(selected, COMPETITORS)).toBe(true);
  });

  it("unchecking one brand from all leaves the rest selected", () => {
    const selected = toggleDiscoveryCompetitor(new Set(), COMPETITORS, "b", false);
    expect([...selected].sort()).toEqual(["a", "c"]);
  });

  it("select all resets to default", () => {
    const selected = setDiscoveryAllCompetitors(COMPETITORS, true);
    expect(selected.size).toBe(0);
  });
});
