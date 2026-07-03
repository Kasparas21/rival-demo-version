import { describe, expect, it } from "vitest";

import { compactPostForInsights } from "@/lib/organic-content/generate-insights";
import {
  insightAiSectionsEmpty,
  sanitizeInsightItem,
  stripPostIdsFromInsightText,
} from "@/lib/organic-content/insight-utils";

describe("stripPostIdsFromInsightText", () => {
  it("removes parenthetical post shortcodes from prose", () => {
    const text =
      "Posts like the Mexico carousel (DaPHgAODEs_) and the Japan FIFA World Cup tribute (DaLpX8sk3EJ) achieve high engagement.";
    expect(stripPostIdsFromInsightText(text, ["DaPHgAODEs_", "DaLpX8sk3EJ"])).toBe(
      "Posts like the Mexico carousel and the Japan FIFA World Cup tribute achieve high engagement.",
    );
  });

  it("preserves normal parenthetical labels", () => {
    const text = "Partner tags (e.g., INAH, SAMURAIBLUE) drive engagement.";
    expect(stripPostIdsFromInsightText(text)).toBe(text);
  });
});

describe("sanitizeInsightItem", () => {
  it("cleans summary and why while keeping post_ids", () => {
    const item = sanitizeInsightItem({
      summary: "Great reel (ABC123xyz789)",
      why: "See post ABC123xyz789 for details.",
      post_ids: ["ABC123xyz789"],
    });
    expect(item.summary).toBe("Great reel");
    expect(item.why).toBe("See post for details.");
    expect(item.post_ids).toEqual(["ABC123xyz789"]);
  });
});

describe("insightAiSectionsEmpty", () => {
  it("returns true when both sections are empty", () => {
    expect(insightAiSectionsEmpty({ whats_working: [], whats_flopping: [] })).toBe(true);
    expect(insightAiSectionsEmpty(null)).toBe(true);
  });

  it("returns false when either section has items", () => {
    expect(
      insightAiSectionsEmpty({
        whats_working: [{ summary: "Works", post_ids: [] }],
        whats_flopping: [],
      }),
    ).toBe(false);
  });
});

describe("compactPostForInsights", () => {
  it("strips heavy fields and truncates content", () => {
    const compact = compactPostForInsights({
      id: "uuid",
      competitor_id: "c",
      user_id: "u",
      platform: "instagram",
      post_id: "abc123",
      content: "x".repeat(500),
      media_urls: ["https://example.com/img.jpg"],
      likes: 10,
      comments: 2,
      shares: 1,
      views: 100,
      posted_at: "2026-06-01T00:00:00.000Z",
      scraped_at: "2026-06-02T00:00:00.000Z",
      raw_data: { product_type: "clips", huge: "payload" },
    });

    expect(compact.post_id).toBe("abc123");
    expect(compact.content).toHaveLength(400);
    expect(compact).not.toHaveProperty("raw_data");
    expect(compact).not.toHaveProperty("media_urls");
    expect(compact.product_type).toBe("clips");
  });
});
