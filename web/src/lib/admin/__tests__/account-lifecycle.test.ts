import { describe, expect, it } from "vitest";

import {
  applyAdminSuspensionToPayload,
  clearAdminSuspensionFromPayload,
  isAdminSuspendedAccount,
  readAdminSuspensionMeta,
} from "@/lib/admin/account-lifecycle";

describe("admin account lifecycle", () => {
  it("detects suspended payload", () => {
    expect(
      isAdminSuspendedAccount({
        admin_account_status: "suspended",
        admin_suspended_at: "2026-07-01T00:00:00.000Z",
        admin_suspended_by: "admin-1",
      }),
    ).toBe(true);
    expect(isAdminSuspendedAccount({ admin_plan_override: "pro" })).toBe(false);
  });

  it("applies and clears suspension metadata", () => {
    const suspended = applyAdminSuspensionToPayload({}, { adminUserId: "admin-1", reason: "billing abuse" });
    expect(readAdminSuspensionMeta(suspended)?.admin_suspension_reason).toBe("billing abuse");

    const cleared = clearAdminSuspensionFromPayload(suspended);
    expect(isAdminSuspendedAccount(cleared)).toBe(false);
    expect(readAdminSuspensionMeta(cleared)).toBeNull();
  });
});
