import { describe, expect, it } from "vitest";

import {
  FULL_SWEEP_ADS_PER_PLATFORM,
  metaSweepCapAllowsKillMarking,
  WORKSPACE_RESCRAPE_ADS_PER_PLATFORM,
} from "@/lib/ad-library/constants";

describe("metaSweepCapAllowsKillMarking", () => {
  it("allows kill marking for full manual/weekly sweeps", () => {
    expect(metaSweepCapAllowsKillMarking(FULL_SWEEP_ADS_PER_PLATFORM)).toBe(true);
    expect(metaSweepCapAllowsKillMarking(2000)).toBe(true);
  });

  it("blocks kill marking for workspace rescrape and default library caps", () => {
    expect(metaSweepCapAllowsKillMarking(WORKSPACE_RESCRAPE_ADS_PER_PLATFORM.meta)).toBe(false);
    expect(metaSweepCapAllowsKillMarking(10)).toBe(false);
    expect(metaSweepCapAllowsKillMarking(25)).toBe(false);
  });
});
