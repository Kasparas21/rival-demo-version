import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authorizeAdminWriteRequestMock = vi.fn();
const deleteUserAccountMock = vi.fn();
const logAdminEventMock = vi.fn();

vi.mock("@/lib/admin/route-auth", () => ({
  authorizeAdminWriteRequest: authorizeAdminWriteRequestMock,
  logAdminEvent: logAdminEventMock,
}));

vi.mock("@/lib/admin/delete-user-account", () => ({
  deleteUserAccount: deleteUserAccountMock,
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
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    },
  };
}

describe("POST /api/admin/users/[id]/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeAdminWriteRequestMock.mockResolvedValue({
      ok: true,
      ctx: {
        adminClient: mockAdminClient({ id: targetUserId, email: "user@example.com" }),
        actorUserId: adminUserId,
      },
    });
    deleteUserAccountMock.mockResolvedValue({ ok: true });
  });

  it("rejects unauthenticated admin requests", async () => {
    authorizeAdminWriteRequestMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const { POST } = await import("@/app/api/admin/users/[id]/delete/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: "user@example.com" }),
      }),
      { params: Promise.resolve({ id: targetUserId }) },
    );

    expect(res.status).toBe(401);
    expect(deleteUserAccountMock).not.toHaveBeenCalled();
  });

  it("requires confirmEmail", async () => {
    const { POST } = await import("@/app/api/admin/users/[id]/delete/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: targetUserId }) },
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "confirmEmail is required" });
    expect(deleteUserAccountMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched email confirmation", async () => {
    const { POST } = await import("@/app/api/admin/users/[id]/delete/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: "wrong@example.com" }),
      }),
      { params: Promise.resolve({ id: targetUserId }) },
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Email confirmation does not match this user." });
    expect(deleteUserAccountMock).not.toHaveBeenCalled();
  });

  it("blocks deleting your own admin account", async () => {
    authorizeAdminWriteRequestMock.mockResolvedValue({
      ok: true,
      ctx: {
        adminClient: mockAdminClient({ id: adminUserId, email: "admin@example.com" }),
        actorUserId: adminUserId,
      },
    });

    const { POST } = await import("@/app/api/admin/users/[id]/delete/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: "admin@example.com" }),
      }),
      { params: Promise.resolve({ id: adminUserId }) },
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "You cannot delete your own admin account from here." });
    expect(deleteUserAccountMock).not.toHaveBeenCalled();
  });

  it("deletes when email confirmation matches", async () => {
    const { POST } = await import("@/app/api/admin/users/[id]/delete/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: "user@example.com" }),
      }),
      { params: Promise.resolve({ id: targetUserId }) },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(logAdminEventMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "admin_user_deleted",
        targetUserId,
      }),
    );
    expect(deleteUserAccountMock).toHaveBeenCalledWith({
      admin: expect.anything(),
      userId: targetUserId,
      polarCustomerId: "cust_1",
      polarSubscriptionId: "sub_1",
    });
  });
});
