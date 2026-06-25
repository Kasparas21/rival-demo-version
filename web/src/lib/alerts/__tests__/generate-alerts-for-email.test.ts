import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateAlertsForEmail } from "@/lib/alerts/generate-alerts-for-email";

const getBillingEntitlementMock = vi.fn();
const upsertMock = vi.fn();

function buildSupabase(rules: Array<{ alert_type: string; enabled: boolean; competitor_id: string | null }>) {
  return {
    from: (table: string) => {
      if (table === "saved_competitors") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { name: "Adidas", brand_name: "Adidas" },
            error: null,
          }),
        };
      }
      if (table === "alert_rules") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: rules, error: null }),
        };
      }
      if (table === "competitor_alerts") {
        return {
          upsert: upsertMock.mockResolvedValue({ error: null }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

vi.mock("@/lib/billing/entitlements", () => ({
  getBillingEntitlement: (...args: unknown[]) => getBillingEntitlementMock(...args),
}));

describe("generateAlertsForEmail", () => {
  const competitorId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
    getBillingEntitlementMock.mockResolvedValue({
      limits: { allowAlertRules: false },
    });
  });

  it("creates alert for nurture emails", async () => {
    await generateAlertsForEmail({
      supabase: buildSupabase([]) as never,
      userId,
      competitorId,
      email: {
        id: "email-1",
        competitor_id: competitorId,
        subject: "Welcome back",
        email_type: "nurture",
        ai_summary: "Welcome series",
        ai_offers: [],
        ai_angle: "value",
        received_at: "2026-06-01T12:00:00.000Z",
      },
    });

    expect(upsertMock).toHaveBeenCalledOnce();
    const payload = upsertMock.mock.calls[0]?.[0];
    expect(payload.alert_type).toBe("competitor_email");
    expect(payload.dedupe_key).toBe(`competitor_email:${competitorId}:email-1`);
    expect(payload.metadata).toMatchObject({ emailId: "email-1", email_type: "nurture" });
  });

  it("skips transactional emails", async () => {
    await generateAlertsForEmail({
      supabase: buildSupabase([]) as never,
      userId,
      competitorId,
      email: {
        id: "email-2",
        competitor_id: competitorId,
        subject: "Order confirmed",
        email_type: "transactional",
        ai_summary: null,
        ai_offers: [],
        ai_angle: null,
        received_at: "2026-06-01T12:00:00.000Z",
      },
    });

    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("respects disabled competitor_email rule when customization allowed", async () => {
    getBillingEntitlementMock.mockResolvedValue({
      limits: { allowAlertRules: true },
    });

    await generateAlertsForEmail({
      supabase: buildSupabase([
        { alert_type: "competitor_email", enabled: false, competitor_id: competitorId },
      ]) as never,
      userId,
      competitorId,
      email: {
        id: "email-3",
        competitor_id: competitorId,
        subject: "Sale",
        email_type: "promotional",
        ai_summary: null,
        ai_offers: [],
        ai_angle: null,
        received_at: "2026-06-01T12:00:00.000Z",
      },
    });

    expect(upsertMock).not.toHaveBeenCalled();
  });
});
