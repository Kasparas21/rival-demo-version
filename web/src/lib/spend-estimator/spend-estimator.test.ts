import { describe, expect, it } from "vitest";

import { buildBrandFootprintFromAds } from "@/lib/spend-estimator/brand-footprint";
import {
  DEFAULT_ESTIMATOR_CONFIG,
  estimateBrandMonthlySpend,
  META_SMB_IMPRESSIONS_PER_AD_PER_MONTH,
  resolveBrandFactorForFootprint,
  resolveEstimatorConfigForBrand,
} from "@/lib/spend-estimator/estimate-spend";
import type { BrandFootprint, FootprintAdInput } from "@/lib/spend-estimator/types";

const baseCtx = {
  competitorId: "c1",
  userId: "u1",
  brandName: "Acme",
  brandDomain: "acme.test",
  lastScrapedAt: null as string | null,
};

function adRow(p: Partial<FootprintAdInput> & Pick<FootprintAdInput, "id">): FootprintAdInput {
  const now = new Date().toISOString();
  return {
    platform: "meta",
    first_seen_at: now,
    last_seen_at: now,
    is_active: true,
    raw_payload: {},
    ...p,
  };
}

describe("buildBrandFootprintFromAds", () => {
  it("returns null when no rows in window", () => {
    const old = new Date(Date.now() - 400 * 86_400_000).toISOString();
    const fp = buildBrandFootprintFromAds([adRow({ id: "1", first_seen_at: old, last_seen_at: old })], baseCtx, 2);
    expect(fp).toBeNull();
  });

  it("computes platform stats and new creative counts", () => {
    const t0 = new Date(Date.now() - 5 * 86_400_000).toISOString();
    const t1 = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const rows = [
      adRow({ id: "a", platform: "meta", first_seen_at: t0, last_seen_at: t0 }),
      adRow({ id: "b", platform: "meta", first_seen_at: t1, last_seen_at: t0, raw_payload: { impressionsIndex: 3 } }),
      adRow({ id: "c", platform: "google", first_seen_at: t0, last_seen_at: t0 }),
    ];
    const fp = buildBrandFootprintFromAds(rows, baseCtx, 2.5, { nowMs: Date.now() });
    expect(fp).not.toBeNull();
    expect(fp!.platform_stats.length).toBe(2);
    const meta = fp!.platform_stats.find((s) => s.platform === "meta")!;
    expect(meta.active_ads).toBe(2);
    expect(meta.has_impression_band).toBe(true);
    expect(meta.new_creatives_30d).toBeGreaterThanOrEqual(2);
  });
});

describe("estimateBrandMonthlySpend", () => {
  const footprint = (partial?: Partial<BrandFootprint>): BrandFootprint => ({
    competitor_id: "c1",
    user_id: "u1",
    brand_domain: "x.test",
    brand_name: "X",
    last_scraped_at: null,
    brand_scale_score: 2,
    platform_stats: [
      {
        platform: "meta",
        active_ads: 10,
        median_days_active: 14,
        p25_days_active: 7,
        p75_days_active: 21,
        new_creatives_30d: 2,
        new_creatives_90d: 5,
        has_impression_band: false,
      },
    ],
    ...partial,
  });

  it("returns zero totals when no platforms", () => {
    const f = footprint({ platform_stats: [] });
    const est = estimateBrandMonthlySpend(f);
    expect(est.total.mid).toBe(0);
  });

  it("increases spend when active_ads increases", () => {
    const low = estimateBrandMonthlySpend(footprint());
    const high = estimateBrandMonthlySpend(
      footprint({
        platform_stats: [
          {
            platform: "meta",
            active_ads: 30,
            median_days_active: 14,
            p25_days_active: 7,
            p75_days_active: 21,
            new_creatives_30d: 2,
            new_creatives_90d: 5,
            has_impression_band: false,
          },
        ],
      })
    );
    expect(high.total.mid).toBeGreaterThan(low.total.mid);
  });

  it("increases spend when median_days_active increases (multi-platform normalization)", () => {
    const statsPair = (medianMeta: number): BrandFootprint["platform_stats"] => [
      {
        platform: "meta",
        active_ads: 10,
        median_days_active: medianMeta,
        p25_days_active: 7,
        p75_days_active: 21,
        new_creatives_30d: 2,
        new_creatives_90d: 5,
        has_impression_band: false,
      },
      {
        platform: "google",
        active_ads: 10,
        median_days_active: 14,
        p25_days_active: 7,
        p75_days_active: 21,
        new_creatives_30d: 2,
        new_creatives_90d: 5,
        has_impression_band: false,
      },
    ];
    const low = estimateBrandMonthlySpend(footprint({ platform_stats: statsPair(14) }));
    const high = estimateBrandMonthlySpend(footprint({ platform_stats: statsPair(60) }));
    expect(high.total.mid).toBeGreaterThan(low.total.mid);
  });

  it("increases spend when brand_scale_score increases", () => {
    const base = footprint({ brand_scale_score: 1 });
    const scaled = footprint({ brand_scale_score: 4 });
    expect(estimateBrandMonthlySpend(scaled, DEFAULT_ESTIMATOR_CONFIG).total.mid).toBeGreaterThan(
      estimateBrandMonthlySpend(base, DEFAULT_ESTIMATOR_CONFIG).total.mid
    );
  });

  it("applies Meta SMB overrides for single-platform Meta with small library", () => {
    const fp = footprint({
      brand_scale_score: 2.7,
      platform_stats: [
        {
          platform: "meta",
          active_ads: 40,
          median_days_active: 20,
          p25_days_active: 10,
          p75_days_active: 30,
          new_creatives_30d: 3,
          new_creatives_90d: 10,
          has_impression_band: false,
        },
      ],
    });
    const { config, meta_smb_profile } = resolveEstimatorConfigForBrand(fp, DEFAULT_ESTIMATOR_CONFIG);
    expect(meta_smb_profile).toBe(true);
    expect(config.impressionsPerAdPerMonth.meta).toBe(META_SMB_IMPRESSIONS_PER_AD_PER_MONTH);
    expect(config.cpmMid.meta).toBe(3.5);
    expect(config.cpmLow.meta).toBe(2);
    expect(config.cpmHigh.meta).toBe(5);

    const est = estimateBrandMonthlySpend(fp, DEFAULT_ESTIMATOR_CONFIG);
    expect(est.assumptions.meta_smb_profile).toBe(true);
    const meta = est.perPlatform.find((p) => p.platform === "meta")!;
    expect(meta.mid).toBeGreaterThanOrEqual(350);
    expect(meta.mid).toBeLessThanOrEqual(900);
  });

  it("does not apply Meta SMB when multiple platforms are present", () => {
    const fp = footprint({
      brand_scale_score: 2,
      platform_stats: [
        {
          platform: "meta",
          active_ads: 20,
          median_days_active: 14,
          p25_days_active: 7,
          p75_days_active: 21,
          new_creatives_30d: 2,
          new_creatives_90d: 5,
          has_impression_band: false,
        },
        {
          platform: "google",
          active_ads: 20,
          median_days_active: 14,
          p25_days_active: 7,
          p75_days_active: 21,
          new_creatives_30d: 2,
          new_creatives_90d: 5,
          has_impression_band: false,
        },
      ],
    });
    const { meta_smb_profile } = resolveEstimatorConfigForBrand(fp, DEFAULT_ESTIMATOR_CONFIG);
    expect(meta_smb_profile).toBe(false);
  });

  it("caps brand factor for single-platform footprints", () => {
    const fp = footprint({ brand_scale_score: 5 });
    const f = resolveBrandFactorForFootprint(fp, DEFAULT_ESTIMATOR_CONFIG);
    expect(f).toBeLessThanOrEqual(1.5);
  });
});
