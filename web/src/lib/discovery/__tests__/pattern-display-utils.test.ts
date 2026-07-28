import { describe, expect, it } from "vitest";

import {
  formatPatternsTimestamp,
  formatWeekLabel,
  formatWeekRange,
  resolvePatternsTimezone,
  safePatternsTimeZone,
} from "@/lib/discovery/pattern-display-utils";

describe("pattern display timezone helpers", () => {
  it("accepts valid IANA timezones", () => {
    expect(safePatternsTimeZone("Europe/Vilnius")).toBe("Europe/Vilnius");
    expect(safePatternsTimeZone("UTC")).toBe("UTC");
  });

  it("falls back to UTC for invalid timezone strings", () => {
    expect(safePatternsTimeZone("Not/A/Timezone")).toBe("UTC");
    expect(safePatternsTimeZone("")).toBe("UTC");
  });

  it("resolves local preference to a valid timezone", () => {
    const tz = resolvePatternsTimezone("local");
    expect(safePatternsTimeZone(tz)).toBe(tz);
  });

  it("formats week labels with timezone in options only", () => {
    const label = formatWeekLabel("2026-07-27", "Europe/Vilnius");
    expect(label).toMatch(/Jul/);
  });

  it("formats week range without throwing for Vilnius", () => {
    expect(() => formatWeekRange("2026-07-27", "Europe/Vilnius")).not.toThrow();
    expect(formatWeekRange("2026-07-27", "Europe/Vilnius")).toContain("–");
  });

  it("formats report timestamp without throwing for Vilnius", () => {
    expect(() =>
      formatPatternsTimestamp("2026-07-28T10:00:00.000Z", "Europe/Vilnius"),
    ).not.toThrow();
  });
});
