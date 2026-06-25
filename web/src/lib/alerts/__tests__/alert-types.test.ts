import { describe, expect, it } from "vitest";

import {
  ALL_ALERT_TYPES,
  DEFAULT_SEVERITY,
  DEFAULT_THRESHOLDS,
  buildActivitySpikeDedupeKey,
  buildAlertBody,
  buildAlertTitle,
  buildCompetitorEmailDedupeKey,
  buildCreativePushDedupeKey,
  buildNewAngleDedupeKey,
  buildNewPlatformDedupeKey,
  buildProvenWinnerDedupeKey,
  parseThresholds,
} from "@/lib/alerts/alert-types";

describe("alert-types", () => {
  it("exposes default thresholds", () => {
    expect(DEFAULT_THRESHOLDS.activityScoreDelta).toBe(20);
    expect(DEFAULT_THRESHOLDS.lifespanDays).toBe(30);
    expect(DEFAULT_THRESHOLDS.creativePushCount).toBe(8);
  });

  it("maps severities for all alert types", () => {
    for (const t of ALL_ALERT_TYPES) {
      expect(["info", "notable", "high"]).toContain(DEFAULT_SEVERITY[t]);
    }
    expect(DEFAULT_SEVERITY.new_platform).toBe("high");
    expect(DEFAULT_SEVERITY.activity_spike).toBe("high");
    expect(DEFAULT_SEVERITY.new_angle).toBe("notable");
  });

  it("builds stable dedupe keys", () => {
    const competitorId = "11111111-1111-1111-1111-111111111111";
    expect(buildNewAngleDedupeKey(competitorId, "Save 50%")).toBe(
      `new_angle:${competitorId}:Save 50%`
    );
    expect(buildNewPlatformDedupeKey(competitorId, "tiktok")).toBe(
      `new_platform:${competitorId}:tiktok`
    );
    expect(buildActivitySpikeDedupeKey(competitorId, "batch-1")).toBe(
      `activity_spike:${competitorId}:batch-1`
    );
    expect(buildCreativePushDedupeKey(competitorId, "batch-1")).toBe(
      `creative_push:${competitorId}:batch-1`
    );
    expect(buildProvenWinnerDedupeKey(competitorId, "ad-1")).toBe(
      `proven_winner:${competitorId}:ad-1`
    );
    expect(buildCompetitorEmailDedupeKey(competitorId, "email-1")).toBe(
      `competitor_email:${competitorId}:email-1`
    );
  });

  it("parses partial threshold overrides", () => {
    expect(parseThresholds({ activityScoreDelta: 30 })).toMatchObject({
      activityScoreDelta: 30,
      lifespanDays: 30,
      creativePushCount: 8,
    });
  });

  it("builds specific titles and bodies with numbers", () => {
    const title = buildAlertTitle("new_platform", {
      competitorName: "Maxima",
      platform: "tiktok",
    });
    const body = buildAlertBody("new_platform", {
      competitorName: "Maxima",
      platform: "tiktok",
      activeAds: 14,
    });
    expect(title).toContain("Maxima");
    expect(title).toContain("TikTok");
    expect(body).toContain("14");
    expect(body).not.toContain("change was detected");
  });

  it("builds competitor_email title and body from email metadata", () => {
    const title = buildAlertTitle("competitor_email", {
      competitorName: "Adidas",
      emailType: "nurture",
    });
    const body = buildAlertBody("competitor_email", {
      competitorName: "Adidas",
      emailType: "nurture",
      emailSubject: "Welcome to the club",
    });
    expect(title).toContain("Adidas");
    expect(title.toLowerCase()).toContain("nurture");
    expect(body).toContain("Welcome to the club");
    expect(DEFAULT_SEVERITY.competitor_email).toBe("notable");
    expect(ALL_ALERT_TYPES).toContain("competitor_email");
  });
});
