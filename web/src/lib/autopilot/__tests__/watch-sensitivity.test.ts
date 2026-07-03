import { describe, expect, it } from "vitest";

import { passesWatchSensitivity } from "@/lib/autopilot/watch-sensitivity";
import { isInQuietHours, localHourInTimezone, parseWatchQuietHours } from "@/lib/autopilot/watch-quiet-hours";

describe("passesWatchSensitivity", () => {
  it("paranoid allows activity_drop", () => {
    expect(passesWatchSensitivity("activity_drop", "notable", "paranoid")).toBe(true);
  });

  it("balanced suppresses activity_drop", () => {
    expect(passesWatchSensitivity("activity_drop", "notable", "balanced")).toBe(false);
  });

  it("balanced allows new_angle only when high", () => {
    expect(passesWatchSensitivity("new_angle", "notable", "balanced")).toBe(false);
    expect(passesWatchSensitivity("new_angle", "high", "balanced")).toBe(true);
  });

  it("big_moves allows activity_spike only when high", () => {
    expect(passesWatchSensitivity("activity_spike", "notable", "big_moves")).toBe(false);
    expect(passesWatchSensitivity("activity_spike", "high", "big_moves")).toBe(true);
  });
});

describe("quiet hours", () => {
  it("parses defaults", () => {
    expect(parseWatchQuietHours(null)).toEqual({
      start: 22,
      end: 7,
      timezone: "Europe/London",
    });
  });

  it("detects overnight quiet window", () => {
    const quiet = { start: 22, end: 7, timezone: "UTC" };
    const late = new Date("2026-07-03T23:00:00.000Z");
    const morning = new Date("2026-07-03T06:00:00.000Z");
    const afternoon = new Date("2026-07-03T14:00:00.000Z");
    expect(localHourInTimezone(late, "UTC")).toBe(23);
    expect(isInQuietHours(late, quiet)).toBe(true);
    expect(isInQuietHours(morning, quiet)).toBe(true);
    expect(isInQuietHours(afternoon, quiet)).toBe(false);
  });
});
