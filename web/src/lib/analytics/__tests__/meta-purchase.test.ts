import { describe, expect, it } from "vitest";

import {
  buildMetaPurchaseEventFromOrder,
  hashMetaEmailForCapi,
  readOrderPaidAmountCents,
} from "@/lib/analytics/meta-purchase";
import { SITE_URL } from "@/lib/seo/site";

describe("hashMetaEmailForCapi", () => {
  it("hashes lowercased trimmed email", () => {
    expect(hashMetaEmailForCapi("  Test@Example.COM ")).toBe(
      hashMetaEmailForCapi("test@example.com"),
    );
  });
});

describe("readOrderPaidAmountCents", () => {
  it("reads camelCase and snake_case total amount", () => {
    expect(readOrderPaidAmountCents({ totalAmount: 4999 } as never)).toBe(4999);
    expect(readOrderPaidAmountCents({ total_amount: 2500 } as never)).toBe(2500);
  });
});

describe("buildMetaPurchaseEventFromOrder", () => {
  it("builds Purchase payload from Polar order shape", () => {
    const event = buildMetaPurchaseEventFromOrder({
      id: "ord_123",
      total_amount: 2900,
      currency: "usd",
      customer: { email: "buyer@example.com" },
      metadata: {
        fbp: "fb.1.111.222",
        fbc: "fb.1.333.444",
        client_ip: "203.0.113.1",
        user_agent: "Mozilla/5.0",
      },
    } as never);

    expect(event).toMatchObject({
      event_name: "Purchase",
      event_id: "ord_123",
      action_source: "website",
      event_source_url: `${SITE_URL}/checkout`,
      user_data: {
        em: [hashMetaEmailForCapi("buyer@example.com")],
        fbp: "fb.1.111.222",
        fbc: "fb.1.333.444",
        client_ip_address: "203.0.113.1",
        client_user_agent: "Mozilla/5.0",
      },
      custom_data: {
        currency: "USD",
        value: 29,
      },
    });
  });
});
