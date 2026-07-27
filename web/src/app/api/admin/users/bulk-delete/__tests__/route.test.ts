import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authorizeAdminWriteRequestMock = vi.fn();
const performAdminUserDeleteMock = vi.fn();
const logAdminEventMock = vi.fn();

vi.mock("@/lib/admin/route-auth", () => ({
  authorizeAdminWriteRequest: authorizeAdminWriteRequestMock,
  logAdminEvent: logAdminEventMock,
}));

vi.mock("@/lib/admin/perform-admin-user-delete", () => ({
  performAdminUserDelete: performAdminUserDeleteMock,
}));

const userA = "22222222-2222-4222-8222-222222222222";
const userB = "44444444-4444-4444-8444-444444444444";
const adminUserId = "33333333-3333-4333-8333-333333333333";

describe("POST /api/admin/users/bulk-delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeAdminWriteRequestMock.mockResolvedValue({
      ok: true,
      ctx: {
        adminClient: {},
        actorUserId: adminUserId,
      },
    });
    performAdminUserDeleteMock.mockResolvedValue({ ok: true, email: "user@example.com" });
  });

  it("rejects unauthenticated requests", async () => {
    authorizeAdminWriteRequestMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const { POST } = await import("@/app/api/admin/users/bulk-delete/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userA], confirmPhrase: "DELETE 1" }),
      }),
    );

    expect(res.status).toBe(401);
    expect(performAdminUserDeleteMock).not.toHaveBeenCalled();
  });

  it("requires DELETE {count} confirmation phrase", async () => {
    const { POST } = await import("@/app/api/admin/users/bulk-delete/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userA, userB], confirmPhrase: "DELETE" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'Confirmation must be exactly "DELETE 2"' });
    expect(performAdminUserDeleteMock).not.toHaveBeenCalled();
  });

  it("rejects when actor is included in batch", async () => {
    const { POST } = await import("@/app/api/admin/users/bulk-delete/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userA, adminUserId], confirmPhrase: "DELETE 2" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(performAdminUserDeleteMock).not.toHaveBeenCalled();
  });

  it("returns mixed success and failure results", async () => {
    performAdminUserDeleteMock
      .mockResolvedValueOnce({ ok: true, email: "a@example.com" })
      .mockResolvedValueOnce({ ok: false, error: "Polar failed", stage: "polar" });

    const { POST } = await import("@/app/api/admin/users/bulk-delete/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userA, userB], confirmPhrase: "DELETE 2" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      deleted: [userA],
      failed: [{ userId: userB, error: "Polar failed" }],
    });
    expect(logAdminEventMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "admin_users_bulk_deleted",
      }),
    );
  });
});
