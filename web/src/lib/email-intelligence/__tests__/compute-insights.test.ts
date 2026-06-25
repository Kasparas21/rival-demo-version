import { describe, expect, it } from "vitest";

import { computeEmailInsights } from "../compute-insights";
import type { EmailRowForInsights } from "../types";

function row(
  partial: Partial<EmailRowForInsights> & Pick<EmailRowForInsights, "received_at">,
): EmailRowForInsights {
  return {
    id: partial.id ?? "email-1",
    subject: "Hello",
    email_type: "promotional",
    ai_offers: [],
    ai_angle: "value",
    esp_detected: "Klaviyo",
    ...partial,
  };
}

describe("computeEmailInsights", () => {
  it("returns zeros and defaults for empty input", () => {
    const insights = computeEmailInsights([]);
    expect(insights.total_emails).toBe(0);
    expect(insights.emails_per_week).toBe(0);
    expect(insights.avg_days_between_emails).toBe(0);
    expect(insights.emoji_usage_percent).toBe(0);
  });

  it("computes avg days between emails", () => {
    const insights = computeEmailInsights([
      row({ received_at: "2026-06-01T12:00:00.000Z" }),
      row({ received_at: "2026-06-08T12:00:00.000Z" }),
      row({ received_at: "2026-06-15T12:00:00.000Z" }),
    ]);
    expect(insights.avg_days_between_emails).toBe(7);
  });

  it("flattens offers and counts offer emails", () => {
    const insights = computeEmailInsights([
      row({
        received_at: "2026-06-10T12:00:00.000Z",
        ai_offers: [{ type: "discount", value: "20% off", code: "SAVE20" }],
      }),
      row({
        received_at: "2026-06-12T12:00:00.000Z",
        ai_offers: [{ type: "discount", value: "Free shipping", code: null }],
      }),
    ]);
    expect(insights.total_emails_with_offers).toBe(2);
    expect(insights.all_offers).toHaveLength(2);
    expect(insights.most_common_offer_type).toBe("discount");
    expect(insights.offer_frequency_days).toBe(2);
  });

  it("detects emoji usage percent", () => {
    const insights = computeEmailInsights([
      row({ received_at: "2026-06-01T12:00:00.000Z", subject: "Sale 🔥 today" }),
      row({ received_at: "2026-06-02T12:00:00.000Z", subject: "Plain subject" }),
    ]);
    expect(insights.emoji_usage_percent).toBe(50);
  });

  it("builds type and angle breakdowns", () => {
    const insights = computeEmailInsights([
      row({ received_at: "2026-06-01T12:00:00.000Z", email_type: "promotional", ai_angle: "urgency" }),
      row({ received_at: "2026-06-02T12:00:00.000Z", email_type: "newsletter", ai_angle: "value" }),
      row({ received_at: "2026-06-03T12:00:00.000Z", email_type: "promotional", ai_angle: "urgency" }),
    ]);
    expect(insights.type_breakdown).toEqual({ promotional: 2, newsletter: 1 });
    expect(insights.most_common_type).toBe("promotional");
    expect(insights.angle_breakdown).toEqual({ urgency: 2, value: 1 });
    expect(insights.most_common_angle).toBe("urgency");
  });

  it("includes email_id on subject lines and offers", () => {
    const insights = computeEmailInsights([
      row({
        id: "subj-1",
        received_at: "2026-06-01T12:00:00.000Z",
        subject: "Flash sale",
        ai_offers: [{ type: "discount", value: "20% off", code: "SAVE20" }],
      }),
    ]);
    expect(insights.subject_lines[0]?.email_id).toBe("subj-1");
    expect(insights.all_offers[0]?.email_id).toBe("subj-1");
  });
});
