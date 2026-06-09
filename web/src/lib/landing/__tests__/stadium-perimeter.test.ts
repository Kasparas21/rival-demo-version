import { describe, expect, it } from "vitest";

import {
  CTA_COMET_CYCLE_MS,
  cometHeadDistance,
  cometPathProgress,
  pointOnStadiumPerimeter,
  sampleCometPoints,
} from "@/lib/landing/stadium-perimeter";

describe("pointOnStadiumPerimeter", () => {
  it("starts at top center", () => {
    const p = pointOnStadiumPerimeter(0, 200, 52);
    expect(p.x).toBe(100);
    expect(p.y).toBe(0);
  });

  it("hits bottom center at halfway", () => {
    const p = pointOnStadiumPerimeter(0.5, 200, 52);
    expect(p.x).toBeCloseTo(100, 0);
    expect(p.y).toBe(52);
  });
});

describe("cometHeadDistance", () => {
  it("starts at origin and moves forward monotonically", () => {
    expect(cometHeadDistance(0, 100)).toBe(0);
    const mid = cometHeadDistance(CTA_COMET_CYCLE_MS / 2, 100);
    expect(mid).toBeCloseTo(50, 0);
    expect(cometHeadDistance(CTA_COMET_CYCLE_MS, 100)).toBe(0);
  });

  it("never decreases within a cycle", () => {
    const total = 100;
    let prev = 0;
    for (let t = 0; t < CTA_COMET_CYCLE_MS; t += 50) {
      const d = cometHeadDistance(t, total);
      expect(d).toBeGreaterThanOrEqual(prev - 0.001);
      prev = d;
    }
  });

  it("progresses linearly through the cycle", () => {
    expect(cometPathProgress(0)).toBe(0);
    expect(cometPathProgress(CTA_COMET_CYCLE_MS * 0.25)).toBeCloseTo(0.25);
    expect(cometPathProgress(CTA_COMET_CYCLE_MS * 0.5)).toBeCloseTo(0.5);
    expect(cometPathProgress(CTA_COMET_CYCLE_MS)).toBe(0);
  });
});

describe("sampleCometPoints", () => {
  it("walks backward from head without wrapping distance jumps", () => {
    const total = 100;
    const head = 10;
    const comet = 20;
    const distances: number[] = [];

    sampleCometPoints(head, comet, total, 8, (d) => {
      distances.push(d);
      return { x: d, y: 0 };
    });

    expect(distances[0]).toBe(10);
    expect(distances[distances.length - 1]).toBe(90);
    for (let i = 1; i < distances.length; i += 1) {
      const step = distances[i - 1] - distances[i];
      const wrappedStep =
        distances[i - 1] < distances[i]
          ? distances[i - 1] + (total - distances[i])
          : step;
      expect(wrappedStep).toBeGreaterThan(0);
      expect(wrappedStep).toBeLessThanOrEqual(comet / 8 + 0.01);
    }
  });
});
