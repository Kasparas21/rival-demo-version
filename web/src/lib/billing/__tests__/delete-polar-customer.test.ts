import { describe, expect, it, vi } from "vitest";
import { deletePolarCustomerForUser } from "@/lib/billing/delete-polar-customer";

const deleteExternal = vi.fn();
const deleteCustomer = vi.fn();
const revokeSubscription = vi.fn();

vi.mock("@/lib/billing/polar", () => ({
  createPolarClient: () => ({
    customers: {
      deleteExternal,
      delete: deleteCustomer,
    },
    subscriptions: {
      revoke: revokeSubscription,
    },
  }),
}));

describe("deletePolarCustomerForUser", () => {
  it("deletes by external id with anonymize", async () => {
    deleteExternal.mockResolvedValue(undefined);
    deleteCustomer.mockReset();
    revokeSubscription.mockReset();

    const result = await deletePolarCustomerForUser({ userId: "user-1" });

    expect(result).toEqual({ ok: true });
    expect(deleteExternal).toHaveBeenCalledWith({ externalId: "user-1", anonymize: true });
    expect(deleteCustomer).not.toHaveBeenCalled();
  });

  it("falls back to polar customer id when external id is not found", async () => {
    deleteExternal.mockRejectedValue(new Error("404 Not Found"));
    deleteCustomer.mockResolvedValue(undefined);

    const result = await deletePolarCustomerForUser({
      userId: "user-1",
      polarCustomerId: "cus_123",
    });

    expect(result).toEqual({ ok: true });
    expect(deleteCustomer).toHaveBeenCalledWith({ id: "cus_123", anonymize: true });
  });

  it("returns error when polar delete fails", async () => {
    deleteExternal.mockRejectedValue(new Error("500 Server error"));
    deleteCustomer.mockRejectedValue(new Error("500 Server error"));

    const result = await deletePolarCustomerForUser({
      userId: "user-1",
      polarCustomerId: "cus_123",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("500");
    }
  });
});
