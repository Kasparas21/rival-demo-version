import { beforeEach, describe, expect, it, vi } from "vitest";

import { aiSampleFingerprint, pickAiSampleAds } from "@/lib/activity-score/ai-sample";
import { computeProductionValueHeuristic } from "@/lib/activity-score/signals/production-value";

const scoreWithHaikuBatch = vi.fn();
vi.mock("@/lib/activity-score/haiku-scorer", () => ({
  scoreWithHaikuBatch: (...a: unknown[]) => scoreWithHaikuBatch(...a),
}));
vi.mock("@/lib/alerts/generate-alerts-for-competitor", () => ({ generateAlertsForCompetitor: vi.fn() }));
vi.mock("@/lib/scrape-batches/get-latest-batch-id", () => ({ getLatestScrapeBatchId: vi.fn(async () => null) }));

import { computeActivityScore } from "@/lib/activity-score/compute";

function reachPayload(reach: number) {
  return { transparency_by_location: { eu_transparency: { eu_total_reach: reach } } };
}

function ad(i: number, over: Partial<{ platform: string; format: string; reach: number; days: number; text: string }> = {}) {
  return {
    format: over.format ?? "image",
    ad_text: over.text ?? `Ad copy number ${i} with an offer`,
    first_seen_at: new Date(Date.now() - (over.days ?? i) * 86_400_000).toISOString(),
    platform: over.platform ?? "meta",
    raw_payload: over.reach ? reachPayload(over.reach) : {},
    ad_creative_url: null,
  };
}

describe("pickAiSampleAds", () => {
  it("is the same for the same ads, whatever their order", () => {
    const ads = Array.from({ length: 30 }, (_, i) => ad(i, { reach: (i * 37) % 11 }));
    const a = pickAiSampleAds(ads, 8).map((x) => x.ad_text);
    const b = pickAiSampleAds([...ads].reverse(), 8).map((x) => x.ad_text);
    expect(a).toEqual(b);
  });

  it("puts the most-seen ads first, then the longest running, one per copy", () => {
    const ads = [
      ad(1, { reach: 100, text: "small" }),
      ad(2, { reach: 9000, text: "big" }),
      ad(3, { text: "old", days: 400 }),
      ad(4, { text: "new", days: 2 }),
      ad(5, { reach: 50, text: "big" }),
    ];
    expect(pickAiSampleAds(ads, 4).map((x) => x.ad_text)).toEqual(["big", "small", "old", "new"]);
  });

  it("fingerprints what the AI saw", () => {
    expect(aiSampleFingerprint(["a  b"], ["c"])).toBe(aiSampleFingerprint(["a b"], ["c"]));
    expect(aiSampleFingerprint(["a"], ["c"])).not.toBe(aiSampleFingerprint(["a"], ["d"]));
  });
});

describe("computeProductionValueHeuristic", () => {
  it("doesn't apply to an advertiser with no social ads", () => {
    expect(computeProductionValueHeuristic([ad(1, { platform: "google", format: "text" })])).toBeNull();
  });

  it("measures video share on social ads only", () => {
    const r = computeProductionValueHeuristic([
      ad(1, { format: "video" }),
      ad(2, { format: "image" }),
      ad(3, { platform: "google", format: "text" }),
      ad(4, { platform: "google", format: "text" }),
    ]);
    expect(r?.videoRatio).toBe(0.5);
  });
});

describe("computeActivityScore", () => {
  let rows: ReturnType<typeof ad>[];
  let priorRawMetrics: Record<string, unknown> | null;
  const upserts: Array<Record<string, unknown>> = [];

  function fakeSupabase() {
    return {
      from(table: string) {
        const chain: Record<string, unknown> = {};
        for (const m of ["select", "eq"]) chain[m] = () => chain;
        chain.maybeSingle = async () => ({ data: priorRawMetrics ? { score: 40, raw_metrics: priorRawMetrics } : null, error: null });
        chain.upsert = async (row: Record<string, unknown>) => {
          upserts.push(row);
          return { error: null };
        };
        chain.then = (ok: (v: unknown) => unknown) =>
          Promise.resolve(table === "scraped_ads" ? { data: rows, error: null } : { data: null, error: null }).then(ok);
        return chain;
      },
    };
  }

  beforeEach(() => {
    rows = Array.from({ length: 12 }, (_, i) => ad(i, { reach: 1000 + i, format: i % 3 === 0 ? "video" : "image" }));
    priorRawMetrics = null;
    upserts.length = 0;
    scoreWithHaikuBatch.mockReset().mockResolvedValue({
      ok: true,
      data: { copy_sophistication: 60, copy_reason: "", distinct_product_count: 4, products_summary: "" },
    });
  });

  it("gives the same score for the same ads", async () => {
    const run = () => computeActivityScore({ userId: "u", competitorId: "c", supabaseAdmin: fakeSupabase() as never, skipPersist: true });
    const a = await run();
    rows = [...rows].reverse();
    const b = await run();
    expect(b.score).toBe(a.score);
    expect(scoreWithHaikuBatch.mock.calls[0]).toEqual(scoreWithHaikuBatch.mock.calls[1]);
  });

  it("reuses the previous AI answer when the sample hasn't changed", async () => {
    const first = await computeActivityScore({ userId: "u", competitorId: "c", supabaseAdmin: fakeSupabase() as never, skipPersist: true });
    priorRawMetrics = first.rawMetrics;
    scoreWithHaikuBatch.mockClear();
    const second = await computeActivityScore({ userId: "u", competitorId: "c", supabaseAdmin: fakeSupabase() as never, skipPersist: true });
    expect(scoreWithHaikuBatch).not.toHaveBeenCalled();
    expect(second.score).toBe(first.score);
    expect(second.rawMetrics.aiReused).toBe(true);
  });

  it("drops production value for a Google-only advertiser and keeps weights at 100%", async () => {
    rows = Array.from({ length: 12 }, (_, i) => ad(i, { platform: "google", format: "text" }));
    const r = await computeActivityScore({ userId: "u", competitorId: "c", supabaseAdmin: fakeSupabase() as never, skipPersist: true });
    expect(r.signals.production_value.weight).toBe(0);
    const total = Object.values(r.signals).reduce((s, x) => s + x.weight, 0);
    expect(total).toBeCloseTo(1);
    expect(r.topReasons.some((x) => x.signal === "production_value")).toBe(false);
  });
});
