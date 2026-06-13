import { describe, expect, it } from "vitest";
import {
  limitsForTier,
  tierAllowsMultipleBrandWorkspaces,
} from "@/lib/billing/plan-limits";

describe("Agency plan", () => {
  it("allows up to 5 brand workspaces only on Agency and admin", () => {
    expect(tierAllowsMultipleBrandWorkspaces("agency")).toBe(true);
    expect(tierAllowsMultipleBrandWorkspaces("admin")).toBe(true);
    expect(tierAllowsMultipleBrandWorkspaces("pro")).toBe(false);
    expect(tierAllowsMultipleBrandWorkspaces("starter")).toBe(false);
    expect(tierAllowsMultipleBrandWorkspaces("free_trial")).toBe(false);
  });

  it("scopes Starter and Pro to one brand workspace", () => {
    expect(limitsForTier("starter").maxOwnBrandWorkspaces).toBe(1);
    expect(limitsForTier("pro").maxOwnBrandWorkspaces).toBe(1);
  });

  it("gives Agency Pro limits scaled 5× for watched competitors", () => {
    expect(limitsForTier("agency").maxOwnBrandWorkspaces).toBe(5);
    expect(limitsForTier("agency").maxWatchedCompetitors).toBe(
      limitsForTier("pro").maxWatchedCompetitors * 5,
    );
  });
});
