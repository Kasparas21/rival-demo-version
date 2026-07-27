import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteUserAccountMock = vi.fn();
const logAdminEventMock = vi.fn();

vi.mock("@/lib/admin/delete-user-account", () => ({
  deleteUserAccount: deleteUserAccountMock,
}));

vi.mock("@/lib/admin/route-auth", () => ({
  logAdminEvent: logAdminEventMock,
}));

const targetUserId = "22222222-2222-4222-8222-222222222222";
const adminUserId = "33333333-3333-4333-8333-333333333333";

function mockAdminClient(profile: { id: string; email: string | null } | null) {
  return {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
        };
      }
      if (table === "billing_subscriptions") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { polar_customer_id: "cust_1", polar_subscription_id: "sub_1" },
            error: null,
          }),
        };
      }
      return {};
    },
  };
}

describe("performAdminUserDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteUserAccountMock.mockResolvedValue({ ok: true });
  });

  it("blocks self-delete", async () => {
    const { performAdminUserDelete } = await import("@/lib/admin/perform-admin-user-delete");
    const result = await performAdminUserDelete({
      adminClient: mockAdminClient({ id: adminUserId, email: "admin@example.com" }) as never,
      actorUserId: adminUserId,
      targetUserId: adminUserId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.selfDelete).toBe(true);
    }
    expect(deleteUserAccountMock).not.toHaveBeenCalled();
  });

  it("returns not found when profile missing", async () => {
    const { performAdminUserDelete } = await import("@/lib/admin/perform-admin-user-delete");
    const result = await performAdminUserDelete({
      adminClient: mockAdminClient(null) as never,
      actorUserId: adminUserId,
      targetUserId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.notFound).toBe(true);
    }
  });

  it("deletes user and logs event", async () => {
    const { performAdminUserDelete } = await import("@/lib/admin/perform-admin-user-delete");
    const result = await performAdminUserDelete({
      adminClient: mockAdminClient({ id: targetUserId, email: "user@example.com" }) as never,
      actorUserId: adminUserId,
      targetUserId,
    });

    expect(result).toEqual({ ok: true, email: "user@example.com" });
    expect(logAdminEventMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "admin_user_deleted",
        targetUserId,
      }),
    );
    expect(deleteUserAccountMock).toHaveBeenCalled();
  });
});
