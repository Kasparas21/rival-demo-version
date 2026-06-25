import { describe, expect, it } from "vitest";

import { applyEmailSearchFilter, buildInsightsResponse, EMAIL_INSIGHTS_MIN_COUNT } from "../api-queries";
import type { EmailRowForInsights } from "../types";

const sampleRow: EmailRowForInsights = {
  id: "email-1",
  received_at: "2026-06-01T12:00:00.000Z",
  subject: "Sale",
  email_type: "promotional",
  ai_offers: [],
  ai_angle: "urgency",
  esp_detected: "Klaviyo",
};

describe("buildInsightsResponse", () => {
  it("locks insights below minimum email count", () => {
    const result = buildInsightsResponse({
      emailCount: EMAIL_INSIGHTS_MIN_COUNT - 1,
      rows: [sampleRow],
    });
    expect(result.insightsLocked).toBe(true);
    expect(result.insights).toBeNull();
    expect(result.unlockAt).toBe(EMAIL_INSIGHTS_MIN_COUNT);
  });

  it("returns insights at or above minimum email count", () => {
    const result = buildInsightsResponse({
      emailCount: EMAIL_INSIGHTS_MIN_COUNT,
      rows: Array.from({ length: EMAIL_INSIGHTS_MIN_COUNT }, () => sampleRow),
    });
    expect(result.insightsLocked).toBe(false);
    expect(result.insights?.total_emails).toBe(EMAIL_INSIGHTS_MIN_COUNT);
  });
});

describe("applyEmailSearchFilter", () => {
  it("applies ilike filters across searchable columns", () => {
    const filters: string[] = [];
    const query = {
      or: (f: string) => {
        filters.push(f);
        return query;
      },
    };
    applyEmailSearchFilter(query, "SAVE20");
    expect(filters).toHaveLength(1);
    expect(filters[0]).toContain("subject.ilike.%SAVE20%");
    expect(filters[0]).toContain("from_email.ilike.%SAVE20%");
    expect(filters[0]).toContain("ai_offers::text.ilike.%SAVE20%");
  });

  it("skips filter when query is empty", () => {
    const query = {
      or: () => {
        throw new Error("should not call or");
      },
    };
    expect(applyEmailSearchFilter(query, "  ")).toBe(query);
  });
});
