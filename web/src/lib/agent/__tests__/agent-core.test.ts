import { describe, expect, it } from "vitest";

import { calculateThreatScore } from "@/lib/agent/threat-score";
import { buildSlackBlocks } from "@/lib/agent/delivery/slack";
import { buildDiscordEmbed } from "@/lib/agent/delivery/discord";
import { extractVisualUrlsFromSignal } from "@/lib/agent/attach-visuals";
import { shouldSkipDetection } from "@/lib/agent/baseline";
import { AGENT_COLD_START_CYCLES } from "@/lib/agent/types";

describe("calculateThreatScore", () => {
  it("starts from nothing", () => {
    expect(calculateThreatScore({})).toBe(0);
  });

  it("scores a long-running, high-reach, multi-platform new angle near the top", () => {
    const score = calculateThreatScore({ days_running: 45, reach_index: 4.4, platform_count: 3, is_new_angle: true });
    expect(score).toBe(9);
  });

  it("keeps a week-old ad that reached ~1K people low", () => {
    expect(calculateThreatScore({ days_running: 8, reach_index: 2, platform_count: 1 })).toBe(2);
  });

  it("uses a long run as a stand-in when reach isn't published", () => {
    expect(calculateThreatScore({ days_running: 60, reach_index: null })).toBe(5);
  });

  it("caps at 10", () => {
    expect(calculateThreatScore({ days_running: 90, reach_index: 6, platform_count: 5, is_new_angle: true })).toBe(10);
  });
});

describe("shouldSkipDetection", () => {
  it("skips before cold start cycles complete", () => {
    expect(shouldSkipDetection({ ads: 0, email: 0, organic: 0 }, "ads")).toBe(true);
    expect(shouldSkipDetection({ ads: 2, email: 0, organic: 0 }, "ads")).toBe(true);
    expect(shouldSkipDetection({ ads: AGENT_COLD_START_CYCLES, email: 0, organic: 0 }, "ads")).toBe(false);
  });

  it("never skips cross-competitor", () => {
    expect(shouldSkipDetection({ ads: 0, email: 0, organic: 0 }, "cross_competitor")).toBe(false);
  });
});

describe("delivery payloads", () => {
  it("builds slack blocks with image limit", () => {
    const { blocks } = buildSlackBlocks("Hello **world**", ["https://a.com/1.jpg", "https://a.com/2.jpg"]);
    expect(blocks.length).toBeGreaterThan(2);
    const images = blocks.filter((b) => b.type === "image");
    expect(images.length).toBeLessThanOrEqual(3);
  });

  it("truncates discord embed description", () => {
    const embed = buildDiscordEmbed("x".repeat(5000), []);
    expect((embed.description as string).length).toBeLessThanOrEqual(4096);
  });
});

describe("extractVisualUrlsFromSignal", () => {
  it("extracts ad creative url", () => {
    const urls = extractVisualUrlsFromSignal({
      signal_type: "new_winning_ad",
      source: "ads",
      threat_score: 7,
      payload: { creative_url: "https://cdn.example/ad.jpg" },
    });
    expect(urls).toContain("https://cdn.example/ad.jpg");
  });

  it("extracts organic media urls", () => {
    const urls = extractVisualUrlsFromSignal({
      signal_type: "organic_spike",
      source: "organic",
      threat_score: 8,
      payload: { media_urls: ["https://cdn.example/post.jpg"] },
    });
    expect(urls).toContain("https://cdn.example/post.jpg");
  });
});

describe("signalsForPrompt", () => {
  it("keeps small signals as they are and caps oversized ones", async () => {
    const { signalsForPrompt } = await import("@/lib/agent/generate-message");
    const small = { signal_type: "new_cta", competitor_id: "c1", threat_score: 7, payload: { new_cta: "Shop now" } };
    const huge = { signal_type: "cross_competitor_trend", competitor_id: null, threat_score: 9, payload: { signals: "x".repeat(2_000_000) } };
    const out = signalsForPrompt([huge, small]);
    expect(out[1]).toEqual(small);
    expect(JSON.stringify(out[0]).length).toBeLessThan(3_000);
    expect(out[0]).toMatchObject({ signal_type: "cross_competitor_trend", threat_score: 9 });
    expect(signalsForPrompt([small, small, small], 2)).toHaveLength(2);
  });
});

describe("detectCrossCompetitorTrends", () => {
  it("references signals instead of copying them, and never builds a trend of trends", async () => {
    const { detectCrossCompetitorTrends } = await import("@/lib/agent/detectors/cross-competitor");
    const rows = [
      { id: "s1", competitor_id: "a", signal_type: "new_cta", threat_score: 7, source: "ads", payload: { new_cta: "Book now", ad: { platform: "meta", ad_text: "x".repeat(5000) } } },
      { id: "s2", competitor_id: "b", signal_type: "new_cta", threat_score: 6, source: "ads", payload: { new_cta: "Get 20% off" } },
      { id: "t1", competitor_id: "a", signal_type: "cross_competitor_trend", threat_score: 9, source: "cross_competitor", payload: { signals: [] } },
      { id: "t2", competitor_id: "b", signal_type: "cross_competitor_trend", threat_score: 9, source: "cross_competitor", payload: { signals: [] } },
    ];
    const query = { select: () => query, eq: () => query, gte: async () => ({ data: rows }) };
    const admin = { from: () => query } as unknown as Parameters<typeof detectCrossCompetitorTrends>[0];
    const out = await detectCrossCompetitorTrends(admin, "user-1");
    expect(out).toHaveLength(1);
    const payload = out[0]!.payload as { trend_type: string; signal_count: number; signals: { id: string; summary: string | null }[] };
    expect(payload.trend_type).toBe("new_cta");
    expect(payload.signal_count).toBe(2);
    expect(payload.signals.map((s) => [s.id, s.summary])).toEqual([["s1", "Book now"], ["s2", "Get 20% off"]]);
    expect(JSON.stringify(payload).length).toBeLessThan(1_000);
  });
});
