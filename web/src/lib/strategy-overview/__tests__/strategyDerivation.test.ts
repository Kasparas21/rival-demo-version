import type { StrategyPlatform } from "@/lib/strategy-overview/payload-types";
import { describe, expect, it } from "vitest";

import {
  computeTrend,
  deriveBrandScale,
  deriveFunnelCells,
  deriveFunnelEdges,
  deriveStrategyOverviewPayload,
  monthlyFirstSeenCounts,
  type ScrapedAdInput,
} from "@/lib/strategy-overview/strategyDerivation";

function ad(
  partial: Partial<ScrapedAdInput> & Pick<ScrapedAdInput, "id" | "first_seen_at">
): ScrapedAdInput {
  return {
    platform: "meta",
    ad_text: "x",
    format: "image",
    last_seen_at: partial.first_seen_at,
    ai_extracted_angle: null,
    funnel_stage: null,
    ...partial,
  };
}

describe("deriveFunnelEdges", () => {
  it("creates forward edges when stages progress and overlap exists", () => {
    const stageByPlatform = new Map([
      ["tiktok", "TOF"],
      ["meta", "MOF"],
      ["google", "BOF"],
    ] as const);

    const angleByPlatform = new Map<string, Set<string>>([
      ["tiktok", new Set(["discount"])],
      ["meta", new Set(["discount", "quality"])],
      ["google", new Set(["quality"])],
    ]);

    const enriched = new Map([
      ["tiktok", 10],
      ["meta", 10],
      ["google", 10],
    ] as const);

    const { edges, detected, suppressed } = deriveFunnelEdges({
      platforms: ["tiktok", "meta", "google"],
      stageByPlatform,
      angleByPlatform,
      enrichedAdsByPlatform: enriched,
    });

    expect(detected).toBeGreaterThan(0);
    expect(suppressed).toBe(0);

    const keys = new Set(edges.map((e) => `${e.from}->${e.to}`));
    expect(keys.has("tiktok->meta")).toBe(true);
    expect(keys.has("meta->google")).toBe(true);
    expect(keys.has("tiktok->google")).toBe(true);
    for (const e of edges) {
      expect(e.confidence).toBeGreaterThanOrEqual(0.4);
    }
  });

  it("suppresses edges when either platform has fewer than 5 enriched ads", () => {
    const stageByPlatform = new Map([
      ["tiktok", "TOF"],
      ["meta", "MOF"],
      ["google", "BOF"],
    ] as const);

    const angleByPlatform = new Map<string, Set<string>>([
      ["tiktok", new Set(["discount"])],
      ["meta", new Set(["discount", "quality"])],
      ["google", new Set(["quality"])],
    ]);

    const { edges, suppressed } = deriveFunnelEdges({
      platforms: ["tiktok", "meta", "google"],
      stageByPlatform,
      angleByPlatform,
      enrichedAdsByPlatform: new Map([
        ["tiktok", 2],
        ["meta", 10],
        ["google", 10],
      ]),
    });

    expect(suppressed).toBeGreaterThan(0);
    expect(edges.find((e) => e.from === "tiktok")).toBeUndefined();
  });
});

describe("monthlyFirstSeenCounts", () => {
  it("buckets first_seen into month slots (oldest of six at index 0)", () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d0 = new Date(y, m - 2, 5).toISOString();
    const d1 = new Date(y, m - 1, 8).toISOString();
    const d2 = new Date(y, m, 3).toISOString();
    const ads = [ad({ id: "a", first_seen_at: d0 }), ad({ id: "b", first_seen_at: d1 }), ad({ id: "c", first_seen_at: d2 })];
    const counts = monthlyFirstSeenCounts(ads, 6);
    expect(counts[3]).toBe(1);
    expect(counts[4]).toBe(1);
    expect(counts[5]).toBe(1);
    expect(counts.reduce((s, x) => s + x, 0)).toBe(3);
  });
});

describe("deriveBrandScale", () => {
  it("scores a single-platform small library toward micro/local tier", () => {
    const past = new Date();
    past.setMonth(past.getMonth() - 2);
    const ads: ScrapedAdInput[] = Array.from({ length: 8 }, (_, i) =>
      ad({
        id: `m${i}`,
        first_seen_at: past.toISOString(),
        last_seen_at: past.toISOString(),
      })
    );
    const byPl = new Map([["meta", ads]] as const);
    const s = deriveBrandScale(ads, byPl);
    expect(s).toBeGreaterThanOrEqual(0.5);
    expect(s).toBeLessThan(1.2);
  });

  it("scores multi-platform higher-velocity set higher than same ad count on one platform", () => {
    const recent = new Date();
    const mono: ScrapedAdInput[] = Array.from({ length: 24 }, (_, i) =>
      ad({
        id: `a${i}`,
        first_seen_at: recent.toISOString(),
        last_seen_at: recent.toISOString(),
      })
    );
    const multi: ScrapedAdInput[] = [
      ...mono.slice(0, 8).map((x, i) => ({ ...x, id: `m1-${i}`, platform: "meta" })),
      ...mono.slice(8, 16).map((x, i) => ({ ...x, id: `g-${i}`, platform: "google" })),
      ...mono.slice(16, 24).map((x, i) => ({ ...x, id: `t-${i}`, platform: "tiktok" })),
    ];
    const byMono = new Map([["meta", mono]] as const);
    const byMulti = new Map<string, ScrapedAdInput[]>([
      ["meta", multi.filter((a) => a.platform === "meta")],
      ["google", multi.filter((a) => a.platform === "google")],
      ["tiktok", multi.filter((a) => a.platform === "tiktok")],
    ]);
    const sMono = deriveBrandScale(mono, byMono as never);
    const sMulti = deriveBrandScale(multi, byMulti as never);
    expect(sMulti).toBeGreaterThan(sMono);
  });
});

describe("computeTrend", () => {
  it("detects up when last point rises vs start of last-four window", () => {
    expect(computeTrend([50, 50, 50, 50, 50, 70])).toBe("up");
  });

  it("detects down when last point drops", () => {
    expect(computeTrend([70, 70, 70, 70, 70, 55])).toBe("down");
  });

  it("returns flat for stable recent window", () => {
    expect(computeTrend([40, 40, 40, 40, 40, 45])).toBe("flat");
  });
});

describe("deriveFunnelCells", () => {
  it("emits one cell per platform × classified stage mix (Denticija-style)", () => {
    const t0 = "2024-01-01T00:00:00.000Z";
    const t1 = "2024-02-01T00:00:00.000Z";
    const byPlatformLive = new Map<StrategyPlatform, ScrapedAdInput[]>([
      [
        "meta",
        [
          ad({ id: "a1", platform: "meta", first_seen_at: t1, funnel_stage: "TOF" }),
          ad({ id: "a2", platform: "meta", first_seen_at: t0, funnel_stage: "TOF" }),
          ad({ id: "a3", platform: "meta", first_seen_at: t0, funnel_stage: "MOF" }),
        ],
      ],
      [
        "google",
        [ad({ id: "b1", platform: "google", first_seen_at: t0, funnel_stage: "BOF" })],
      ],
    ]);

    const cells = deriveFunnelCells(byPlatformLive, 1.5);
    const byId = new Map(cells.map((c) => [c.id, c]));
    expect(byId.get("meta:TOF")?.adCount).toBe(2);
    expect(byId.get("meta:TOF")?.sampleAdIds[0]).toBe("a1");
    expect(byId.get("meta:MOF")?.adCount).toBe(1);
    expect(byId.get("google:BOF")?.adCount).toBe(1);
  });

  it("produces no cells when platform has no live ads", () => {
    expect(deriveFunnelCells(new Map(), 1.2)).toEqual([]);
  });

  it("places wholly unclassified platform ads in the platform default stage (Google → BOF)", () => {
    const now = new Date().toISOString();
    const byPlatformLive = new Map<StrategyPlatform, ScrapedAdInput[]>([
      [
        "google",
        [
          ad({ id: "g1", platform: "google", first_seen_at: now, funnel_stage: null }),
          ad({ id: "g2", platform: "google", first_seen_at: now, funnel_stage: null }),
        ],
      ],
    ]);
    const cells = deriveFunnelCells(byPlatformLive, 1.2);
    expect(cells).toHaveLength(1);
    expect(cells[0]?.id).toBe("google:BOF");
    expect(cells[0]?.adCount).toBe(2);
  });
});

describe("deriveStrategyOverviewPayload live creative counts", () => {
  const competitor = { name: "T", domain: "t.com", logoUrl: null as string | null };

  it("uses distinct Meta creative ids for adCount, not raw row count", () => {
    const now = new Date().toISOString();
    const ads: ScrapedAdInput[] = Array.from({ length: 100 }, (_, i) => ({
      id: `row-${i}`,
      platform: "meta",
      ad_text: "x",
      format: "image",
      first_seen_at: now,
      last_seen_at: now,
      ai_extracted_angle: null,
      funnel_stage: null,
      is_active: true,
      raw_payload: { id: "same-archive-id" },
    }));
    const payload = deriveStrategyOverviewPayload(ads, competitor, null);
    const meta = payload.map.platformNodes.find((n) => n.platform === "meta");
    expect(meta?.adCount).toBe(1);
    expect(payload.map.activeAdCount).toBe(1);
  });
});
