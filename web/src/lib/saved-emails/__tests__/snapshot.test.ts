import { describe, expect, it } from "vitest";

import { savedEmailToCompetitorRow, buildSavedEmailInsert } from "@/lib/saved-emails/snapshot";

describe("saved email snapshot", () => {
  const src = {
    id: "email-1",
    tracker_id: "tracker-1",
    user_id: "user-1",
    competitor_id: "comp-1",
    from_email: "news@brand.com",
    from_name: "Brand",
    subject: "Hello",
    preview_text: "Preview",
    html_body: "<p>Hi</p>",
    plain_text: "Hi",
    received_at: "2026-07-01T08:00:00.000Z",
    esp_detected: "Klaviyo",
    email_type: "promotional",
    ai_summary: "Summary",
    ai_offers: [],
    ai_cta: "Shop now",
    ai_angle: "urgency",
    ai_processed_at: "2026-07-01T08:05:00.000Z",
    ai_analysis_error: null,
    ai_analysis_attempts: 1,
    ai_deep_analysis: { email_type: "promotional" },
    ai_analysis_version: "v2",
    created_at: "2026-07-01T08:00:00.000Z",
  };

  it("maps saved row back to competitor email shape", () => {
    const saved = {
      ...buildSavedEmailInsert(src, "user-1"),
      id: "saved-1",
      saved_at: "2026-07-02T08:00:00.000Z",
      created_at: "2026-07-02T08:00:00.000Z",
      updated_at: "2026-07-02T08:00:00.000Z",
    };
    const row = savedEmailToCompetitorRow(saved);
    expect(row.id).toBe("email-1");
    expect(row.subject).toBe("Hello");
    expect(row.html_body).toBe("<p>Hi</p>");
    expect(row.ai_deep_analysis).toEqual({ email_type: "promotional" });
  });
});
