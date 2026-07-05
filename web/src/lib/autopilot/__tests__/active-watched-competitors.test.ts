import { describe, expect, it } from "vitest";

import {
  isBrandWatchEnabled,
  resolveWatchScope,
  type BrandWatchTarget,
} from "@/lib/autopilot/active-watched-competitors";

function target(partial: Partial<BrandWatchTarget> & { brandId: string }): BrandWatchTarget {
  return {
    brandName: partial.brandId,
    brandDomain: null,
    brandContext: null,
    isPrimary: false,
    competitorIds: new Set<string>(),
    ...partial,
  };
}

const nike = target({
  brandId: "nike",
  brandName: "Nike",
  isPrimary: true,
  competitorIds: new Set(["adidas", "calai", "ikea"]),
});
const puma = target({
  brandId: "puma",
  brandName: "Puma",
  competitorIds: new Set(["ikea", "neptunas"]),
});
const telia = target({
  brandId: "telia",
  brandName: "Telia",
  competitorIds: new Set(["bite"]),
});

const targets = [nike, puma, telia];

describe("isBrandWatchEnabled", () => {
  it("defaults primary brand on, others off", () => {
    expect(isBrandWatchEnabled({}, "nike", true)).toBe(true);
    expect(isBrandWatchEnabled({}, "telia", false)).toBe(false);
  });

  it("explicit values override defaults", () => {
    expect(isBrandWatchEnabled({ nike: false }, "nike", true)).toBe(false);
    expect(isBrandWatchEnabled({ telia: true }, "telia", false)).toBe(true);
  });
});

describe("resolveWatchScope", () => {
  it("defaults to the primary brand sidebar only", () => {
    const scope = resolveWatchScope(targets, { watch_workspaces: {}, watch_competitor_ids: null });
    expect(scope.allowedCompetitorIds).toEqual(new Set(["adidas", "calai", "ikea"]));
    expect(scope.enabledBrands.map((b) => b.brandId)).toEqual(["nike"]);
  });

  it("includes other workspaces when toggled on", () => {
    const scope = resolveWatchScope(targets, {
      watch_workspaces: { telia: true },
      watch_competitor_ids: null,
    });
    expect(scope.allowedCompetitorIds).toEqual(new Set(["adidas", "calai", "ikea", "bite"]));
    expect(scope.brandByCompetitorId.get("bite")?.brandName).toBe("Telia");
  });

  it("excludes primary brand competitors when it is toggled off", () => {
    const scope = resolveWatchScope(targets, {
      watch_workspaces: { nike: false, puma: true },
      watch_competitor_ids: null,
    });
    expect(scope.allowedCompetitorIds).toEqual(new Set(["ikea", "neptunas"]));
  });

  it("attributes a shared competitor to the primary brand", () => {
    const scope = resolveWatchScope(targets, {
      watch_workspaces: { nike: true, puma: true },
      watch_competitor_ids: null,
    });
    expect(scope.brandByCompetitorId.get("ikea")?.brandId).toBe("nike");
  });

  it("intersects an explicit pick list with enabled brand sidebars", () => {
    const scope = resolveWatchScope(targets, {
      watch_workspaces: {},
      watch_competitor_ids: ["calai", "bite", "bmw"],
    });
    expect(scope.allowedCompetitorIds).toEqual(new Set(["calai"]));
  });

  it("drops explicit picks whose workspace was disabled", () => {
    const scope = resolveWatchScope(targets, {
      watch_workspaces: { nike: false },
      watch_competitor_ids: ["calai", "adidas"],
    });
    expect(scope.allowedCompetitorIds.size).toBe(0);
  });
});
