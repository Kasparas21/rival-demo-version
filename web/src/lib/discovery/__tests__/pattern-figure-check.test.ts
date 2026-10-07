import { describe, expect, it } from "vitest";

import {
  figuresInInput,
  findUnsupportedFigures,
  removeUnsupportedFigures,
  unsupportedFiguresIn,
} from "@/lib/discovery/pattern-figure-check";
import type { DiscoveryPatternInsights } from "@/lib/discovery/pattern-types";

const input = {
  week: { new_launches: { this_week: 9, previous_week_same_days: 10 }, retired: { this_week: 6, previous_week_same_days: 0 } },
  metrics: { video_share_pct: 43, video_share_of_new_pct: 11, median_run_days_of_killed: 42.5, total_ads: 101 },
  changed_ads: [
    { id: "256b6ccb-1111-2222-3333-444444444444", days_running: 93, text: "Save 30% this week only", impressions_index: 2.6 },
    { id: "b", days_running: 4, text: "Visi dantys ant 4 implantų nuo 2 929 €", impressions_index: null },
  ],
};
const allowed = figuresInInput(input);

describe("unsupportedFiguresIn", () => {
  it("accepts figures from the input, including rounded ones", () => {
    expect(unsupportedFiguresIn("9 new ads vs 10 in the same days last week; 6 retired", allowed)).toEqual([]);
    expect(unsupportedFiguresIn("Killed ads ran a median 43 days; 43% of active ads are video", allowed)).toEqual([]);
    expect(unsupportedFiguresIn("ad 256b6ccb has run 93 days", allowed)).toEqual([]);
    expect(unsupportedFiguresIn("Full-arch offers sit at 2,929 € and 2929 €", allowed)).toEqual([]);
  });

  it("flags invented averages, percentages and multiples", () => {
    expect(unsupportedFiguresIn("New video ads average ~2.2 vs ~1.5 for images", allowed)).toEqual(["~2.2", "~1.5"]);
    expect(unsupportedFiguresIn("Urgency hooks were 22% of new ads", allowed)).toEqual(["22%"]);
    expect(unsupportedFiguresIn("Kill rate surges 6x", allowed)).toEqual(["6x"]);
  });

  it("ignores dates, years and quoted ad copy", () => {
    expect(
      unsupportedFiguresIn("Launched Sep 25-Oct 1 and on 2026-10-05 (week of 9/28) in 2026, saying 'Save 30% today'", allowed),
    ).toEqual([]);
    expect(unsupportedFiguresIn('Copy like "Only 48 hours left" wins', allowed)).toEqual([]);
  });
});

describe("removeUnsupportedFigures", () => {
  const insights: DiscoveryPatternInsights = {
    headline: "Kill rate surges 6x as launches slow",
    market_temperature: "cooling_down",
    temperature_reason: "9 ads launched vs 10 in the same days last week. That is a 10% drop.",
    patterns: [
      {
        title: "Video outperforms image",
        category: "format",
        description: "New video ads average ~2.2 reach vs ~1.5. Video is 43% of active ads (index 2.6).",
        confidence: "medium",
        evidence_ad_ids: [],
        trend_direction: "rising",
      },
      {
        title: "Urgency at 22% of launches",
        category: "hook",
        description: "Urgency hooks are growing.",
        confidence: "low",
        evidence_ad_ids: [],
        trend_direction: "rising",
      },
    ],
    winners_playbook: ["Lead with social proof.", "Run 3.5 variants per test."],
    graveyard_lessons: [],
    recommended_tests: [],
    competitor_spotlight: null,
  };

  it("finds each unsupported figure with where it was", () => {
    expect(findUnsupportedFigures(insights, input).map((i) => `${i.field}: ${i.figure}`)).toEqual([
      "headline: 6x",
      "temperature_reason: 10%",
      "patterns[0].description: ~2.2",
      "patterns[0].description: ~1.5",
      "patterns[1].title: 22%",
      "winners_playbook[1]: 3.5",
    ]);
  });

  it("drops the sentences and items that state them", () => {
    const cleaned = removeUnsupportedFigures(insights, input);
    expect(cleaned.temperature_reason).toBe("9 ads launched vs 10 in the same days last week.");
    expect(cleaned.patterns).toHaveLength(1);
    expect(cleaned.patterns[0]!.description).toBe("Video is 43% of active ads (index 2.6).");
    expect(cleaned.headline).toBe("Video outperforms image");
    expect(cleaned.winners_playbook).toEqual(["Lead with social proof."]);
    expect(findUnsupportedFigures(cleaned, input)).toEqual([]);
  });
});
