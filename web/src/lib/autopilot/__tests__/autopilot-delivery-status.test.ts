import { describe, expect, it } from "vitest";

import { nextAutopilotWatchRunUtc } from "@/lib/autopilot/autopilot-delivery-status";

describe("nextAutopilotWatchRunUtc", () => {
  it("returns later today when before 07:15 UTC", () => {
    const now = new Date("2026-07-05T06:00:00.000Z");
    const next = nextAutopilotWatchRunUtc(now);
    expect(next.toISOString()).toBe("2026-07-05T07:15:00.000Z");
  });

  it("returns tomorrow when after 07:15 UTC", () => {
    const now = new Date("2026-07-05T08:00:00.000Z");
    const next = nextAutopilotWatchRunUtc(now);
    expect(next.toISOString()).toBe("2026-07-06T07:15:00.000Z");
  });
});
