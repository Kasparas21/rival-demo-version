import { describe, expect, it } from "vitest";
import {
  friendlyPolarCheckoutError,
  shouldPrefillPolarCustomerEmail,
} from "../polar-checkout-email";

describe("shouldPrefillPolarCustomerEmail", () => {
  it("blocks test.com and allows real domains", () => {
    expect(shouldPrefillPolarCustomerEmail("brand@test.com")).toBe(false);
    expect(shouldPrefillPolarCustomerEmail("user@gmail.com")).toBe(true);
    expect(shouldPrefillPolarCustomerEmail(null)).toBe(false);
  });
});

describe("friendlyPolarCheckoutError", () => {
  it("explains misleading product_price_id when empty fbp metadata broke checkout", () => {
    const msg = friendlyPolarCheckoutError(
      '{"detail":[{"loc":["metadata","fbp"],"msg":"String should have at least 1 character"},{"loc":["product_price_id"],"msg":"Field required"}]}',
    );
    expect(msg).toContain("analytics metadata");
  });

  it("explains test.com rejection", () => {
    const msg = friendlyPolarCheckoutError(
      'brand@test.com is not a valid email address: The domain name test.com does not accept email.',
    );
    expect(msg).toContain("test.com");
    expect(msg).toContain("real email");
  });
});
