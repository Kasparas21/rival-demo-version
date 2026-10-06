import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { detectAdsSignals } from "@/lib/agent/detectors/ads";
import type { AgentAdInput, AgentBaselineMetrics } from "@/lib/agent/types";
import type { Database } from "@/lib/supabase/types";

type Row = Record<string, unknown>;

/** Thenable query builder over in-memory rows; counts every query sent. */
function fakeAdmin(table: Row[]) {
  let queries = 0;
  const client = {
    from() {
      queries++;
      let rows = [...table];
      let cap = Infinity;
      const builder = {
        select() {
          return builder;
        },
        eq(col: string, val: unknown) {
          rows = rows.filter((r) => r[col] === val);
          return builder;
        },
        gte(col: string, val: string) {
          rows = rows.filter((r) => String(r[col]) >= val);
          return builder;
        },
        order() {
          return builder;
        },
        limit(n: number) {
          cap = n;
          return builder;
        },
        then(resolve: (v: { data: Row[]; error: null }) => unknown) {
          return Promise.resolve({ data: rows.slice(0, cap), error: null }).then(resolve);
        },
      };
      return builder;
    },
  };
  return { admin: client as unknown as SupabaseClient<Database>, queries: () => queries };
}

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

function ad(key: string, overrides: Partial<AgentAdInput> = {}): AgentAdInput {
  return {
    stable_ad_key: key,
    platform: "meta",
    ad_text: "Comfy shoes for every day",
    first_seen_at: daysAgo(10),
    last_seen_at: daysAgo(0),
    ai_extracted_angle: "comfort",
    ad_creative_url: null,
    raw_payload: {},
    ...overrides,
  } as AgentAdInput;
}

const baseline = { ads: { avg_ad_duration_days: 5 } } as AgentBaselineMetrics;

describe("detectAdsSignals", () => {
  it("uses a fixed number of queries no matter how many new ads there are", async () => {
    const history: Row[] = [
      { competitor_id: "c1", stable_ad_key: "old", platform: "meta", first_seen_at: daysAgo(5), ai_extracted_angle: "comfort", ad_text: "Shop now" },
    ];
    const few = fakeAdmin(history);
    await detectAdsSignals({ admin: few.admin, competitorId: "c1", newAds: [ad("a")], baseline });
    const many = fakeAdmin(history);
    await detectAdsSignals({
      admin: many.admin,
      competitorId: "c1",
      newAds: Array.from({ length: 40 }, (_, i) => ad(`n${i}`)),
      baseline,
    });
    expect(many.queries()).toBe(few.queries());
    expect(many.queries()).toBeLessThanOrEqual(3);
  });

  it("flags a new CTA and a platform the competitor never used, but not a known angle", async () => {
    const history: Row[] = [
      { competitor_id: "c1", stable_ad_key: "old", platform: "meta", first_seen_at: daysAgo(5), ai_extracted_angle: "comfort", ad_text: "Learn more" },
    ];
    const { admin } = fakeAdmin(history);
    const signals = await detectAdsSignals({
      admin,
      competitorId: "c1",
      newAds: [ad("new", { platform: "tiktok", ad_text: "Shop now and save" })],
      baseline,
    });
    const types = signals.map((s) => s.signal_type).sort();
    expect(types).toContain("new_cta");
    expect(types).toContain("platform_expansion");
    const winning = signals.find((s) => s.signal_type === "new_winning_ad");
    if (winning) expect((winning.payload as { is_new_angle: boolean }).is_new_angle).toBe(false);
  });

  it("does not count an ad's own earlier row as prior use", async () => {
    const history: Row[] = [
      { competitor_id: "c1", stable_ad_key: "same", platform: "meta", first_seen_at: daysAgo(5), ai_extracted_angle: "scarcity", ad_text: "Buy now" },
    ];
    const { admin } = fakeAdmin(history);
    const signals = await detectAdsSignals({
      admin,
      competitorId: "c1",
      newAds: [ad("same", { ai_extracted_angle: "scarcity", ad_text: "Buy now" })],
      baseline,
    });
    expect(signals.map((s) => s.signal_type)).toContain("new_cta");
    expect(signals.map((s) => s.signal_type)).not.toContain("platform_expansion");
  });
});
