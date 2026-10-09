import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({}) }));

import { needsRun, RESULT_TTL_MS, STALE_RUN_MS, viewOf } from "@/lib/competitor-recommendations/store";

const now = Date.parse("2026-10-09T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();
const row = (r: Partial<Parameters<typeof viewOf>[0] & object>) => ({
  domain: "rothys.com",
  status: "done" as const,
  result: null,
  error: null,
  started_at: ago(60_000),
  finished_at: ago(1_000),
  ...r,
});

describe("competitor recommendations store", () => {
  it("runs when there's nothing, it failed, it died mid-run, or it's out of date", () => {
    expect(needsRun(null, now)).toBe(true);
    expect(needsRun(row({ status: "failed" }), now)).toBe(true);
    expect(needsRun(row({ status: "running", started_at: ago(60_000) }), now)).toBe(false);
    expect(needsRun(row({ status: "running", started_at: ago(STALE_RUN_MS + 1) }), now)).toBe(true);
    expect(needsRun(row({ finished_at: ago(RESULT_TTL_MS - 1) }), now)).toBe(false);
    expect(needsRun(row({ finished_at: ago(RESULT_TTL_MS + 1) }), now)).toBe(true);
  });

  it("shows a dead run as failed and strips internal fields from results", () => {
    expect(viewOf(row({ status: "running", started_at: ago(STALE_RUN_MS + 1) }), "rothys.com", now).status).toBe("failed");
    const result = {
      profile: { brandName: "Rothy's", category: "shoes", businessType: "ecommerce", city: null, country: "US" },
      recommendations: [
        { domain: "tieks.com", name: "Tieks", hint: "x", rejectReason: null, isDirect: true, score: 80, relevance: 85, group: "peer" },
      ],
      rejected: [{ domain: "a.com" }, { domain: "b.com" }],
    };
    const v = viewOf(row({ result: result as never }), "rothys.com", now);
    expect(v).toMatchObject({ status: "done", checked: 3, profile: { brandName: "Rothy's", country: "US" } });
    expect(v.recommendations[0]).toEqual({ domain: "tieks.com", name: "Tieks", relevance: 85, group: "peer" });
  });
});
