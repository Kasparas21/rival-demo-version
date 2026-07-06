import { describe, expect, it } from "vitest";

import {
  alertWatchScore,
  normalizeWatchMinScoreForUi,
  passesWatchMinScore,
  watchSensitivityForMinScore,
} from "@/lib/autopilot/watch-alert-score";
import { passesWatchFilter } from "@/lib/autopilot/watch-sensitivity";

describe("alertWatchScore", () => {
  it("scores platform_exit high at 9 for critical tier", () => {
    expect(alertWatchScore("platform_exit", "high")).toBe(9);
  });

  it("scores new_platform high at 10", () => {
    expect(alertWatchScore("new_platform", "high")).toBe(10);
  });
});

describe("passesWatchMinScore", () => {
  it("blocks activity_drop at 6+", () => {
    expect(passesWatchMinScore("activity_drop", "notable", 6)).toBe(false);
  });

  it("blocks new_angle notable at 6+", () => {
    expect(passesWatchMinScore("new_angle", "notable", 6)).toBe(false);
  });

  it("allows new_angle high at 6+", () => {
    expect(passesWatchMinScore("new_angle", "high", 6)).toBe(true);
  });

  it("allows activity_spike high at 8+", () => {
    expect(passesWatchMinScore("activity_spike", "high", 8)).toBe(true);
  });

  it("blocks activity_spike notable at 8+", () => {
    expect(passesWatchMinScore("activity_spike", "notable", 8)).toBe(false);
  });

  it("allows platform_exit high at 9+", () => {
    expect(passesWatchMinScore("platform_exit", "high", 9)).toBe(true);
  });

  it("blocks competitor_email at 9+", () => {
    expect(passesWatchMinScore("competitor_email", "notable", 9)).toBe(false);
  });
});

describe("passesWatchFilter", () => {
  it("uses min score when set", () => {
    expect(
      passesWatchFilter("new_angle", "notable", { watch_min_score: 6, watch_sensitivity: "balanced" }),
    ).toBe(false);
  });

  it("falls back to sensitivity when min score null", () => {
    expect(
      passesWatchFilter("activity_drop", "notable", { watch_min_score: null, watch_sensitivity: "paranoid" }),
    ).toBe(true);
    expect(
      passesWatchFilter("activity_drop", "notable", { watch_min_score: null, watch_sensitivity: "balanced" }),
    ).toBe(false);
  });
});

describe("normalizeWatchMinScoreForUi", () => {
  it("clamps to 1–10", () => {
    expect(normalizeWatchMinScoreForUi(10)).toBe(10);
    expect(normalizeWatchMinScoreForUi(0)).toBe(1);
    expect(normalizeWatchMinScoreForUi(99)).toBe(10);
    expect(normalizeWatchMinScoreForUi(null)).toBe(6);
  });
});

describe("watchSensitivityForMinScore", () => {
  it("maps slider tiers", () => {
    expect(watchSensitivityForMinScore(3)).toBe("paranoid");
    expect(watchSensitivityForMinScore(6)).toBe("balanced");
    expect(watchSensitivityForMinScore(8)).toBe("big_moves");
    expect(watchSensitivityForMinScore(10)).toBe("big_moves");
  });
});
