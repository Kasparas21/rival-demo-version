import { describe, expect, it } from "vitest";

import {
  formatQuietHoursTimezoneLabel,
  quietHoursTimezoneOptions,
} from "../quiet-hours-timezones";

describe("quietHoursTimezoneOptions", () => {
  it("pins browser and current timezone at the top", () => {
    const options = quietHoursTimezoneOptions({
      current: "Europe/Vilnius",
      browserTimezone: "Europe/London",
    });

    expect(options[0]).toBe("Europe/London");
    expect(options[1]).toBe("Europe/Vilnius");
    expect(options).toContain("America/New_York");
  });

  it("keeps a custom saved timezone even if unsupported", () => {
    const options = quietHoursTimezoneOptions({
      current: "Custom/Zone",
      browserTimezone: "UTC",
    });

    expect(options[0]).toBe("Custom/Zone");
  });
});

describe("formatQuietHoursTimezoneLabel", () => {
  it("marks the device timezone", () => {
    expect(formatQuietHoursTimezoneLabel("Europe/Vilnius", "Europe/Vilnius")).toBe(
      "Europe/Vilnius (your device)",
    );
    expect(formatQuietHoursTimezoneLabel("Europe/London", "Europe/Vilnius")).toBe("Europe/London");
  });
});
