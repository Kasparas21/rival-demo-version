import { afterEach, describe, expect, it } from "vitest";

import {
  getTesterInviteConfig,
  isTesterInviteExpired,
  matchesTesterInviteCode,
  normalizeInviteCode,
  testerInviteUnavailableMessage,
} from "../tester-invite";

describe("tester-invite", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("matches configured invite code case-insensitively", () => {
    process.env.TESTER_INVITE_CODE = "rv-may21-x7k2";
    process.env.TESTER_INVITE_MAX_USES = "10";
    expect(matchesTesterInviteCode("RV-MAY21-X7K2")).toBe(true);
    expect(matchesTesterInviteCode("wrong")).toBe(false);
  });

  it("returns null config when invite code unset", () => {
    delete process.env.TESTER_INVITE_CODE;
    expect(getTesterInviteConfig()).toBeNull();
  });

  it("detects expired invites", () => {
    process.env.TESTER_INVITE_CODE = "test";
    process.env.TESTER_INVITE_MAX_USES = "10";
    process.env.TESTER_INVITE_EXPIRES_AT = "2020-01-01T00:00:00.000Z";
    const config = getTesterInviteConfig();
    expect(config).not.toBeNull();
    expect(isTesterInviteExpired(config!)).toBe(true);
  });

  it("normalizes invite codes", () => {
    expect(normalizeInviteCode("  ABC  ")).toBe("abc");
  });

  it("maps unavailable reasons to user-facing copy", () => {
    expect(testerInviteUnavailableMessage("full")).toContain("limit");
    expect(testerInviteUnavailableMessage("expired")).toContain("expired");
  });
});
