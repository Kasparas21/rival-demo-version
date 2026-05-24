import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  isProProductId,
  polarApiErrorMessage,
  readProductId,
} from "@/lib/billing/polar-api-raw";

describe("polar-api-raw", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      ...env,
      POLAR_STARTER_PRODUCT_ID: "starter-id",
      POLAR_PRO_PRODUCT_ID: "pro-id",
    };
  });

  afterEach(() => {
    process.env = env;
  });

  it("readProductId prefers product_id", () => {
    expect(readProductId({ id: "sub", status: "active", product_id: "a", productId: "b" })).toBe(
      "a",
    );
  });

  it("isProProductId identifies pro product", () => {
    expect(isProProductId("pro-id")).toBe(true);
    expect(isProProductId("starter-id")).toBe(false);
    expect(isProProductId("unknown")).toBe(false);
  });

  it("polarApiErrorMessage extracts detail string", () => {
    expect(
      polarApiErrorMessage({
        ok: false,
        status: 422,
        json: { detail: "Cannot change product during trial" },
        text: "",
      }),
    ).toBe("Cannot change product during trial");
  });
});
