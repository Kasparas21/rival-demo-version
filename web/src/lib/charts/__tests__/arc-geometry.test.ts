import { describe, expect, it } from "vitest";

import { describeArcClockwise, polarToCartesian } from "@/lib/charts/arc-geometry";

describe("polarToCartesian", () => {
  it("maps 0° to the top of the circle", () => {
    const p = polarToCartesian(100, 100, 50, 0);
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(50, 5);
  });

  it("maps 90° to the right", () => {
    const p = polarToCartesian(100, 100, 50, 90);
    expect(p.x).toBeCloseTo(150, 5);
    expect(p.y).toBeCloseTo(100, 5);
  });
});

describe("describeArcClockwise", () => {
  it("generates a valid SVG path for a short arc", () => {
    const d = describeArcClockwise(100, 100, 80, 0, 90);
    expect(d).toMatch(/^M [\d.-]+ [\d.-]+ A/);
    expect(d.split(" ").length).toBeGreaterThan(6);
  });

  it("uses largeArcFlag=0 for arcs <= 180°", () => {
    const d = describeArcClockwise(100, 100, 80, 45, 135);
    const parts = d.split(" ");
    const aIdx = parts.indexOf("A");
    expect(parts[aIdx + 4]).toBe("0");
  });

  it("uses largeArcFlag=1 for arcs > 180°", () => {
    const d = describeArcClockwise(100, 100, 80, 0, 200);
    const parts = d.split(" ");
    const aIdx = parts.indexOf("A");
    expect(parts[aIdx + 4]).toBe("1");
  });

  it("uses sweep flag 1 (clockwise) consistently", () => {
    const d = describeArcClockwise(50, 50, 40, 10, 100);
    const parts = d.split(" ");
    const aIdx = parts.indexOf("A");
    expect(parts[aIdx + 5]).toBe("1");
  });
});
