import { describe, expect, it } from "vitest";

import { formatWatchSlackBlockMrkdwn } from "../watch-slack";
import type { WatchAlertBlock } from "../types";

function sampleBlock(overrides: Partial<WatchAlertBlock> = {}): WatchAlertBlock {
  return {
    id: "alert-1",
    user_id: "user-1",
    competitor_id: "comp-1",
    alert_type: "activity_spike",
    severity: "high",
    title: "Activity spike",
    body: null,
    metadata: {},
    detected_at: "2026-07-13T12:00:00.000Z",
    competitorName: "Acme Corp",
    competitorHost: "acme.com",
    headline: "Launched a new pricing page",
    context: "They added a mid-tier plan with annual billing.",
    recommendation: "Compare your pricing tiers and test a counter-offer.",
    confidence: "medium",
    investigateUrl: "https://spy-rival.com/investigate",
    ...overrides,
  };
}

describe("formatWatchSlackBlockMrkdwn", () => {
  it("leads with client brand for agency-style alerts", () => {
    const text = formatWatchSlackBlockMrkdwn(
      sampleBlock({ clientBrandName: "Margentūra" }),
    );

    expect(text.startsWith("*Margentūra*")).toBe(true);
    expect(text).toContain("*Acme Corp* — Launched a new pricing page");
    expect(text).not.toContain("· for Margentūra");
  });

  it("keeps competitor-first format when no client brand is set", () => {
    const text = formatWatchSlackBlockMrkdwn(sampleBlock());

    expect(text.startsWith("*Acme Corp*")).toBe(true);
    expect(text).not.toContain("· for");
  });
});
