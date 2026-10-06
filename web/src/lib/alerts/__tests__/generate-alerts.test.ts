import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildActivitySpikeDedupeKey,
  buildNewPlatformDedupeKey,
  buildProvenWinnerDedupeKey,
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

type Call = { method: string; args: unknown[] };
type Resolver = (table: string, calls: Call[]) => unknown;

/** Chainable stand-in for the Supabase query builder: records calls and resolves through `resolve`. */
function makeSupabaseMock(opts: {
  rules?: Array<{ alert_type: string; enabled: boolean; competitor_id: string | null; threshold?: object }>;
  /** created_at of the competitor's previous batch; null makes this scrape the first (baseline). */
  previousBatchAt?: string | null;
  /** created_at of the competitor's first batch; defaults to the previous batch (or this one). */
  firstBatchAt?: string;
  winnerAds?: Array<{ id: string; platform: string; ad_text: string; first_seen_at: string }>;
}) {
  const upsertRows: unknown[] = [];
  const queries: Array<{ table: string; calls: Call[] }> = [];
  const upsert = vi.fn(async (rows: unknown[]) => {
    upsertRows.push(...(Array.isArray(rows) ? rows : [rows]));
    return { error: null };
  });

  const batchNow = new Date().toISOString();
  const resolve: Resolver = (table, calls) => {
    const has = (method: string) => calls.some((c) => c.method === method);
    if (table === "alert_rules") return { data: opts.rules ?? [], error: null };
    if (table === "saved_competitors") return { data: { name: "Maxima", brand_name: "Maxima" }, error: null };
    if (table === "scrape_batches") {
      const prev = opts.previousBatchAt === undefined ? "2026-09-01T00:00:00.000Z" : opts.previousBatchAt;
      if (has("lt")) return { data: prev ? { created_at: prev } : null, error: null };
      if (has("order")) return { data: { created_at: opts.firstBatchAt ?? prev ?? batchNow }, error: null };
      return { data: { created_at: batchNow }, error: null };
    }
    if (table === "scraped_ads") {
      if (has("lte")) return { data: opts.winnerAds ?? [], error: null };
      return { count: 0, error: null };
    }
    return { data: null, error: null };
  };

  const from = vi.fn((table: string) => {
    if (table === "competitor_alerts") return { upsert };
    const calls: Call[] = [];
    queries.push({ table, calls });
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "lt", "lte", "gt", "gte", "order", "limit", "maybeSingle"]) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ method, args });
        return chain;
      };
    }
    chain.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(resolve(table, calls)).then(onFulfilled, onRejected);
    return chain;
  });

  return { from, upsertRows, upsert, queries };
}

const billing = { limits: { allowAlertRules: false } };
vi.mock("@/lib/billing/entitlements", () => ({
  getBillingEntitlement: async () => billing,
}));

beforeEach(() => {
  billing.limits.allowAlertRules = false;
});

function payloadWithPlatform(activeAds: number): CompetitorStrategyOverviewPayload {
  return minimalPayload({
    insights: {
      ...minimalPayload().insights,
      platform_footprint: {
        ...minimalPayload().insights.platform_footprint,
        platforms: [
          { platform: "tiktok", label: "TikTok", activeAds, estSpendEur: 0, funnelStage: "MOF", spendShare: 100 },
        ],
      },
    },
  });
}

describe("generateAlertsForCompetitor", () => {
  it("maps new_platform moves with dedupe keys and severity", async () => {
    const mock = makeSupabaseMock({});

    await generateAlertsForCompetitor({
      supabase: mock as never,
      userId,
      competitorId,
      beforePayload: minimalPayload(),
      afterPayload: payloadWithPlatform(12),
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

  it("skips disabled rules when the plan allows customising them", async () => {
    billing.limits.allowAlertRules = true;
    const mock = makeSupabaseMock({
      rules: [{ alert_type: "new_platform", enabled: false, competitor_id: null }],
    });

    await generateAlertsForCompetitor({
      supabase: mock as never,
      userId,
      competitorId,
      beforePayload: minimalPayload(),
      afterPayload: payloadWithPlatform(5),
      batchId,
    });

    expect(mock.upsertRows).toHaveLength(0);
  });

  it("inserts activity spike with batch dedupe key", async () => {
    const mock = makeSupabaseMock({});

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

  it("says nothing on a competitor's first scrape (the baseline)", async () => {
    const mock = makeSupabaseMock({
      previousBatchAt: null,
      winnerAds: [{ id: "ad-1", platform: "meta", ad_text: "Old ad", first_seen_at: "2025-01-01T00:00:00.000Z" }],
    });

    await generateAlertsForCompetitor({
      supabase: mock as never,
      userId,
      competitorId,
      beforePayload: minimalPayload(),
      afterPayload: payloadWithPlatform(40),
      batchId,
      activityScoreBefore: 0,
      activityScoreAfter: 80,
    });

    expect(mock.upsert).not.toHaveBeenCalled();
    expect(mock.queries.some((q) => q.table === "scraped_ads")).toBe(false);
  });

  it("treats the other platforms' batches from that first scrape as baseline too", async () => {
    const mock = makeSupabaseMock({
      previousBatchAt: new Date(Date.now() - 33_000).toISOString(),
      winnerAds: [{ id: "ad-2", platform: "google", ad_text: "Old ad", first_seen_at: "2025-01-01T00:00:00.000Z" }],
    });

    await generateAlertsForCompetitor({
      supabase: mock as never,
      userId,
      competitorId,
      beforePayload: minimalPayload(),
      afterPayload: payloadWithPlatform(40),
      batchId,
    });

    expect(mock.upsert).not.toHaveBeenCalled();
  });

  it("only flags winners that crossed the lifespan since the previous scrape", async () => {
    const previousBatchAt = "2026-09-20T00:00:00.000Z";
    const mock = makeSupabaseMock({
      previousBatchAt,
      winnerAds: [{ id: "ad-9", platform: "meta", ad_text: "Crossed", first_seen_at: "2026-06-15T00:00:00.000Z" }],
    });

    await generateAlertsForCompetitor({ supabase: mock as never, userId, competitorId, batchId });

    const winnerQuery = mock.queries.find(
      (q) => q.table === "scraped_ads" && q.calls.some((c) => c.method === "lte"),
    )!;
    const lowerBound = winnerQuery.calls.find((c) => c.method === "gt");
    expect(lowerBound?.args[0]).toBe("first_seen_at");
    expect(Date.parse(lowerBound!.args[1] as string)).toBeLessThan(Date.parse(previousBatchAt));
    const winner = mock.upsertRows.find((r) => (r as { alert_type: string }).alert_type === "proven_winner") as
      | { dedupe_key: string }
      | undefined;
    expect(winner?.dedupe_key).toBe(buildProvenWinnerDedupeKey(competitorId, "ad-9"));
  });
});
