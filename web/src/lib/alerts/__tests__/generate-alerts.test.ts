import { describe, expect, it, vi } from "vitest";

import {
  buildActivitySpikeDedupeKey,
  buildNewPlatformDedupeKey,
  DEFAULT_SEVERITY,
} from "@/lib/alerts/alert-types";
import { generateAlertsForCompetitor } from "@/lib/alerts/generate-alerts-for-competitor";
import type { CompetitorStrategyOverviewPayload } from "@/lib/strategy-overview/payload-types";

const competitorId = "22222222-2222-2222-2222-222222222222";
const userId = "33333333-3333-3333-3333-333333333333";
const batchId = "44444444-4444-4444-4444-444444444444";

function minimalPayload(overrides: Partial<CompetitorStrategyOverviewPayload> = {}): CompetitorStrategyOverviewPayload {
  const base: CompetitorStrategyOverviewPayload = {
    version: 1,
    sourceScrapeBatchId: batchId,
    map: {
      title: "T",
      competitor: { name: "Maxima", domain: "maxima.com", logoUrl: null },
      totalAdSpend: { value: 0, currency: "EUR", unit: "month", confidence: "low" },
      spendVsSimilar: "Low",
      spendTrendline: [],
      audienceSignals: { interests: [], ageRange: "", geo: "", targetingType: [] },
      dominantFormat: { format: "video", percentage: 100 },
      toneOfVoice: { primary: "", attributes: [] },
      topAngles: [],
      platformNodes: [],
      funnelEdges: [],
      activeAdCount: 0,
      platformCount: 0,
    },
    insights: {
      platform_footprint: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        platforms: [],
        totalActiveAds: 0,
        totalEstSpendEur: 0,
        platformCount: 0,
      },
      budget_allocation: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        segments: [],
        totalEstSpendEur: 0,
        insight: "",
      },
      library_activity_timeline: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        months: [],
        dataQuality: { realLaunchPct: 0, qualityLabel: "low", warning: null },
      },
      funnel_distribution: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        stages: [],
        totalClassified: 0,
        totalAds: 0,
        insufficientData: true,
      },
      angle_clustering: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        angles: [],
        unclassifiedPct: 0,
        insufficientData: true,
      },
      voice_tone_position: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        competitor: null,
        userBrand: null,
        sampleSize: 0,
      },
      ad_format_mix: {
        title: "",
        subtitle: "",
        tooltip: "",
        lastUpdated: new Date().toISOString(),
        dataConfidence: "low",
        formats: [],
      },
      voice_tone_by_platform: [],
      angles_by_platform: [],
      testing_velocity_by_platform: [],
    },
  };
  return { ...base, ...overrides };
}

function makeSupabaseMock(opts: {
  planTier?: "starter" | "pro";
  rules?: Array<{ alert_type: string; enabled: boolean; competitor_id: string | null; threshold?: object; notify_email?: boolean }>;
  upsertRows?: unknown[];
}) {
  const upsertRows: unknown[] = opts.upsertRows ?? [];
  const upsert = vi.fn(async (rows: unknown[]) => {
    upsertRows.push(...(Array.isArray(rows) ? rows : [rows]));
    return { error: null };
  });

  const from = vi.fn((table: string) => {
    if (table === "alert_rules") {
      return {
        select: () => ({
          eq: async () => ({ data: opts.rules ?? [], error: null }),
        }),
      };
    }
    if (table === "saved_competitors") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { name: "Maxima", brand_name: "Maxima" },
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    if (table === "scrape_batches") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { created_at: new Date().toISOString() }, error: null }),
          }),
        }),
      };
    }
    if (table === "scraped_ads") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({ count: 0, error: null }),
                lte: () => ({ limit: async () => ({ data: [], error: null }) }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "competitor_alerts") {
      return { upsert };
    }
    if (table === "billing_subscriptions") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                status: "active",
                polar_product_id: opts.planTier === "pro" ? "pro-id" : "starter-id",
                raw_payload: {},
              },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "tester_invite_redemptions") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
    }
    return {};
  });

  return { from, upsertRows, upsert };
}

vi.mock("@/lib/billing/config", () => ({
  getPolarProductIds: () => ({ pro: "pro-id", starter: "starter-id" }),
}));

describe("generateAlertsForCompetitor", () => {
  it("maps new_platform moves with dedupe keys and severity", async () => {
    const before = minimalPayload({
      insights: {
        ...minimalPayload().insights,
        platform_footprint: {
          ...minimalPayload().insights.platform_footprint,
          platforms: [],
        },
      },
    });
    const after = minimalPayload({
      insights: {
        ...minimalPayload().insights,
        platform_footprint: {
          ...minimalPayload().insights.platform_footprint,
          platforms: [
            {
              platform: "tiktok",
              label: "TikTok",
              activeAds: 12,
              estSpendEur: 0,
              funnelStage: "MOF",
              spendShare: 100,
            },
          ],
        },
      },
    });

    const mock = makeSupabaseMock({ planTier: "starter" });

    await generateAlertsForCompetitor({
      supabase: mock as never,
      userId,
      competitorId,
      beforePayload: before,
      afterPayload: after,
      batchId,
    });

    expect(mock.upsert).toHaveBeenCalled();
    const row = mock.upsertRows[0] as {
      alert_type: string;
      dedupe_key: string;
      severity: string;
      title: string;
      body: string;
    };
    expect(row.alert_type).toBe("new_platform");
    expect(row.dedupe_key).toBe(buildNewPlatformDedupeKey(competitorId, "tiktok"));
    expect(row.severity).toBe(DEFAULT_SEVERITY.new_platform);
    expect(row.title).toContain("Maxima");
    expect(row.body).toContain("12");
  });

  it("skips disabled Pro rules", async () => {
    const before = minimalPayload();
    const after = minimalPayload({
      insights: {
        ...minimalPayload().insights,
        platform_footprint: {
          ...minimalPayload().insights.platform_footprint,
          platforms: [
            {
              platform: "tiktok",
              label: "TikTok",
              activeAds: 5,
              estSpendEur: 0,
              funnelStage: "MOF",
              spendShare: 100,
            },
          ],
        },
      },
    });

    const mock = makeSupabaseMock({
      planTier: "pro",
      rules: [{ alert_type: "new_platform", enabled: false, competitor_id: null }],
    });

    await generateAlertsForCompetitor({
      supabase: mock as never,
      userId,
      competitorId,
      beforePayload: before,
      afterPayload: after,
      batchId,
    });

    expect(mock.upsertRows).toHaveLength(0);
  });

  it("inserts activity spike with batch dedupe key", async () => {
    const mock = makeSupabaseMock({ planTier: "starter" });

    await generateAlertsForCompetitor({
      supabase: mock as never,
      userId,
      competitorId,
      batchId,
      activityScoreBefore: 40,
      activityScoreAfter: 65,
    });

    const spike = mock.upsertRows.find(
      (r) => (r as { alert_type: string }).alert_type === "activity_spike"
    ) as { dedupe_key: string; title: string } | undefined;

    expect(spike).toBeTruthy();
    expect(spike!.dedupe_key).toBe(buildActivitySpikeDedupeKey(competitorId, batchId));
    expect(spike!.title).toContain("+25");
  });
});
