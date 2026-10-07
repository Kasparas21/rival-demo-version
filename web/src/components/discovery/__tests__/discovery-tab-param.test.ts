import { describe, expect, it } from "vitest";

import { discoveryTabParam, parseDiscoveryTab } from "@/components/discovery/discovery-types";

describe("Discovery ?tab= param", () => {
  it("reads hyphenated and underscored values", () => {
    expect(parseDiscoveryTab("patterns")).toBe("patterns");
    expect(parseDiscoveryTab("whats-new")).toBe("whats_new");
    expect(parseDiscoveryTab("landing_pages")).toBe("landing_pages");
    expect(parseDiscoveryTab(" Stats ")).toBe("stats");
  });

  it("ignores unknown or missing values", () => {
    expect(parseDiscoveryTab("nope")).toBeNull();
    expect(parseDiscoveryTab(null)).toBeNull();
    expect(parseDiscoveryTab("")).toBeNull();
  });

  it("writes hyphenated values and drops the default tab", () => {
    expect(discoveryTabParam("whats_new")).toBe("whats-new");
    expect(discoveryTabParam("explore")).toBeNull();
    for (const tab of ["trending", "ultimate", "whats_new", "patterns", "landing_pages", "stats"] as const) {
      expect(parseDiscoveryTab(discoveryTabParam(tab))).toBe(tab);
    }
  });
});
