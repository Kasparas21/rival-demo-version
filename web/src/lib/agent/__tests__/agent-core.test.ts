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
